import { NextRequest, NextResponse } from "next/server";
import { buffer } from "micro";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma, waitForDb } from "@/lib/prisma";

// ✅ Disable Next.js default body parsing (critical for raw buffer validation)
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  const rawBody = await request.arrayBuffer();
  const bodyBuffer = Buffer.from(rawBody);
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      bodyBuffer,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await waitForDb(); // ✅ Wake up Neon DB

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (error) {
    console.error("Error processing event:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.clerkUserId;
  const subscriptionId = session.subscription as string;
  const planType = session.metadata?.planType as string;

  if (!userId || !subscriptionId) {
    console.log("Missing userId or subscriptionId in session metadata.");
    return;
  }

  await retryPrismaUpdate(async () => {
    await prisma.profile.update({
      where: { userId },
      data: {
        subscriptionActive: true,
        subscriptionTier: planType,
        stripeSubscriptionId: subscriptionId,
      },
    });
  }, "CheckoutSessionCompleted");
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = invoice.subscription;
  if (!subId) return;

  let userId: string | undefined;
  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile) {
      console.log("No profile found for subscriptionId:", subId);
      return;
    }

    userId = profile.userId;
  } catch (error) {
    console.log("Error fetching profile:", error);
    return;
  }

  await retryPrismaUpdate(async () => {
    await prisma.profile.update({
      where: { userId },
      data: { subscriptionActive: false },
    });
  }, "InvoicePaymentFailed");
}

async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const subId = subscription.id;
  if (!subId) return;

  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subId },
      select: { userId: true },
    });

    if (!profile) {
      console.log("No profile found for subscriptionId:", subId);
      return;
    }

    await retryPrismaUpdate(async () => {
      await prisma.profile.update({
        where: { userId: profile.userId },
        data: {
          subscriptionActive: false,
          subscriptionTier: null,
          stripeSubscriptionId: null,
        },
      });
    }, "CustomerSubscriptionDeleted");
  } catch (error) {
    console.log("Error fetching profile:", error);
  }
}

async function retryPrismaUpdate(
  fn: () => Promise<void>,
  context: string,
  maxRetries = 3,
  delayMs = 2000
) {
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await fn();
      console.log(`✅ ${context}: Prisma update successful.`);
      return;
    } catch (error: any) {
      console.warn(`⚠️ ${context}: Attempt ${i + 1} failed - ${error.message}`);
      if (i === maxRetries - 1) {
        console.error(`❌ ${context}: All ${maxRetries} attempts failed.`);
      } else {
        await delay(delayMs);
      }
    }
  }
}
