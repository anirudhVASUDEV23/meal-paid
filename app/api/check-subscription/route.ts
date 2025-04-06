import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    console.log("User ID from request:", userId);
    // Log the userId for debugging
    //we will get the userId from the search params

    if (!userId) {
      return NextResponse.json({ error: "Missing USER ID" }, { status: 400 });
    }
    //we will check if the user has a subscription in the database and return the subscription status
    console.log("Before DB query");
    const profile = await prisma.profile.findFirst({
      where: { userId: String(userId) },
      select: { subscriptionActive: true },
    });
    console.log("After DB query");
    console.log("Profile:", profile);
    return NextResponse.json({
      subscriptionActive: profile?.subscriptionActive,
    });
  } catch (error) {
     console.error("DB Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
