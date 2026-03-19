// src/services/stripe.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Price IDs (set these after creating products in Stripe dashboard) ────────
// Create 3 products in Stripe → each with a recurring monthly price
// Then paste the price IDs here
export const PLANS = {
  starter: {
    name:    "Starter",
    priceId: process.env.STRIPE_PRICE_STARTER,   // e.g. price_1ABC...
    amount:  4900,   // €49 in cents
  },
  growth: {
    name:    "Growth",
    priceId: process.env.STRIPE_PRICE_GROWTH,    // e.g. price_1DEF...
    amount:  9900,   // €99 in cents
  },
  pro: {
    name:    "Pro",
    priceId: process.env.STRIPE_PRICE_PRO,       // e.g. price_1GHI...
    amount:  24900,  // €249 in cents
  },
};

/**
 * Create a Stripe Checkout session with 50% off first month
 */
export async function createCheckoutSession({ plan, customerEmail, successUrl, cancelUrl }) {
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  // Create a 50% off coupon for the first month only
  // We use a promotion code so Stripe applies it automatically
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],

    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],

    // 50% off first month via Stripe discount
    discounts: [
      {
        coupon: process.env.STRIPE_COUPON_50_OFF, // create this once in Stripe dashboard
      },
    ],

    // Pre-fill email if we have it
    customer_email: customerEmail || undefined,

    // Metadata so we know which plan they picked
    metadata: {
      plan,
      planName: planConfig.name,
    },

    subscription_data: {
      metadata: {
        plan,
        planName: planConfig.name,
      },
    },

    success_url: successUrl,
    cancel_url:  cancelUrl,
  });

  return session;
}

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

export default stripe;
