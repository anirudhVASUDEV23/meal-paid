import dotenv from "dotenv";

dotenv.config();

export interface Plan {
  name: string;
  amount: number;
  currency: string;
  interval: string; // for matching with stripeSubscriptionId
  isPopular?: boolean;
  description: string;
  features: string[];
}

export const availablePlans: Plan[] = [
  {
    name: "Weekly Plan",
    amount: 9.99,
    currency: "USD",
    interval: "week",
    description:
      "Great if you want to try the service before committing longer.",
    features: [
      "Unlimited AI meal plans",
      "AI nutrition insights",
      "Cancel Anytime",
    ],
  },
  {
    name: "Monthly Plan",
    amount: 39.99,
    currency: "USD",
    interval: "month", // ✅ Fixed interval
    isPopular: true,
    description: "A flexible monthly subscription for meal planning.",
    features: [
      "Unlimited AI meal plans",
      "AI nutrition insights",
      "Priority support",
    ],
  },
  {
    name: "Yearly Plan",
    amount: 299.99,
    currency: "USD",
    interval: "year", // ✅ Fixed interval
    description: "Best value for long-term users.",
    features: [
      "Unlimited AI meal plans",
      "AI nutrition insights",
      "Exclusive discounts",
    ],
  },
];

const priceIDMap: Record<string, string> = {
  week: process.env.STRIPE_PRICE_WEEKLY!,
  month: process.env.STRIPE_PRICE_MONTHLY!,
  year: process.env.STRIPE_PRICE_YEARLY!,
};
/*
The Record<K, V> utility type in TypeScript creates an object type where:

K represents the keys of the object.

V represents the values of the object.
*/

export const getPriceIDFromType = (planType: string) => priceIDMap[planType];
