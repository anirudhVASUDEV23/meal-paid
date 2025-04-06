import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        const session = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(session);
        break;
      }
      case "customer.subscription.deleted": {
        const session = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionDeleted(session);
        break;
      }
      default: {
        console.log("Unhandled event type:", event.type);
      }
    }
  } catch (error) {
    console.log("Error handling event:", error);
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
  if (!userId) {
    console.log("No userId found in metadata");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.log("No subscriptionId found in session");
    return;
  }

  const planType = session.metadata?.planType as string;

  await retryPrismaUpdate(async () => {
    await prisma.profile.update({
      where: {
        userId: userId,
      },
      data: {
        subscriptionActive: true,
        subscriptionTier: planType,
        stripeSubscriptionId: subscriptionId,
      },
    });
  }, "CheckoutSessionCompleted");
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = (invoice as Stripe.Invoice & { subscription: string })
    .subscription;
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
      data: {
        subscriptionActive: false,
        subscriptionTier: null,
        stripeSubscriptionId: null,
      },
    });
  }, "CustomerSubscriptionDeleted");
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
