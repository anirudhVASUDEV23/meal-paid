# 🥗 MealPlan Subscription App

🔗 **Live Demo**: [https://meal-paid-pttb.vercel.app](https://meal-paid-pttb.vercel.app)

A full-stack subscription-based web application built with **Next.js (App Router)**, **Stripe** for secure recurring payments, and **Prisma ORM** for database access. Users can create profiles, choose meal plans, subscribe to a plan, and manage their subscription with ease.

---

## 🌟 Features

### 👤 User Account & Profile
- Simple sign-up and profile creation
- Auto-profile setup after login
- Edit plan or unsubscribe anytime

### 💳 Stripe Subscriptions
- Plan-based pricing with Stripe Checkout
- Webhook integration to handle payments & cancellations
- Handles checkout, subscription status, and updates securely

### 🍽️ Meal Plan Generator
- Generate personalized meal plans (placeholder or AI integration)
- Tied to subscription status — only subscribed users can access

### 🧭 Subscription Management
- Check if a user has an active subscription
- Change plans mid-cycle
- Cancel subscription anytime

### ⚙️ Serverless API Routes
Built-in API routes under `app/api/`:
- `checkout/`: Starts Stripe Checkout
- `check-subscription/`: Checks user’s subscription status
- `profile/`: Change plan, unsubscribe, and more
- `generate-mealplan/`: Logic to produce meals (based on plan)
- `webhook/`: Stripe webhook handler

---

## 🧩 Tech Stack

| Layer         | Tech                             |
|---------------|----------------------------------|
| **Frontend**  | Next.js(App Router),Tailwind CSS |
| **Backend**   | API Routes (app/api), TypeScript |
| **Payments**  | Stripe (Checkout + Webhooks)     |
| **Database**  | PostgreSQL (via Prisma ORM)      |
| **Auth**      | Clerk                            |
| **State Mgmt**| React Query                      |


