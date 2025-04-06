import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    console.log("Clerk User:", clerkUser);

    if (!clerkUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ Before calling prisma.profile.findUnique");

    const profile = await prisma.profile.findUnique({
      where: {
        userId: clerkUser.id,
      },
      select: {
        subscriptionTier: true,
      },
    });

    console.log("Profile from DB:", profile);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ subscription: profile });
  } catch (error) {
    console.error("Subscription API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
