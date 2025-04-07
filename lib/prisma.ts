import { PrismaClient } from "@prisma/client";

declare global {
  //Allow global `var` declarations
  //to prevent multiple prisma Client instances in dev
  // See https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
  //eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export { prisma };

export async function waitForDb(maxRetries = 5, delayMs = 2000) {
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1"); // ping DB
      console.log("✅ DB is ready");
      return;
    } catch (e) {
      console.log(`⏳ DB not ready. Retry ${i + 1}/${maxRetries}`);
      await delay(delayMs);
    }
  }

  throw new Error("❌ Database is not reachable after retries.");
}
