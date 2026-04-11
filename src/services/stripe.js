// src/services/stripe.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PLANS = {
  starter: {
    name: "Starter",
    priceId: {
      USD: process.env.STRIPE_PRICE_STARTER_USD,
      EUR: process.env.STRIPE_PRICE_STARTER_EUR,
    },
  },
  growth: {
    name: "Growth",
    priceId: {
      USD: process.env.STRIPE_PRICE_GROWTH_USD,
      EUR: process.env.STRIPE_PRICE_GROWTH_EUR,
    },
  },
  pro: {
    name: "Pro",
    priceId: {
      USD: process.env.STRIPE_PRICE_PRO_USD,
      EUR: process.env.STRIPE_PRICE_PRO_EUR,
    },
  },
};

export async function createCheckoutSession({ plan, currency = "USD", customerEmail, successUrl, cancelUrl }) {
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  const priceId = planConfig.priceId[currency] || planConfig.priceId["USD"];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    discounts: [{ coupon: process.env.STRIPE_COUPON_50_OFF }],
    customer_email: customerEmail || undefined,
    metadata: { plan, planName: planConfig.name, currency },
    subscription_data: { metadata: { plan, planName: planConfig.name } },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

export function constructWebhookEvent(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

export default stripe;
