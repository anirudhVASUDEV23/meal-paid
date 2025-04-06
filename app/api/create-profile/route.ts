import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = clerkUser.emailAddresses[0].emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "User does not have an email Account" },
        { status: 400 }
      );
    }

    //to use prisma we need a prisma client which we are defining in lib/prisma.ts
    const existingProfile = await prisma.profile.findUnique({
      where: {
        //an error before as i didn't mention unique in the prisma model definition when i created it
        //the is gone
        userId: clerkUser.id,
      },
    });

    if (existingProfile) {
      console.log(existingProfile.subscriptionActive);
      return NextResponse.json({
        message: "Profile already exists",
        subscriptionActive: existingProfile.subscriptionActive,
      });
    }

    const profile = await prisma.profile.create({
      data: {
        userId: clerkUser.id,
        email: email,
        subscriptionTier: null,
        stripeSubscriptionId: null,
        subscriptionActive: false, //already false by default no need to add but im adding
      },
    });
    console.log(profile);
    return NextResponse.json(
      { message: "Profile created successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: (error as Error).message,
      },
      {
        status: 500,
      }
    );
  }
}
