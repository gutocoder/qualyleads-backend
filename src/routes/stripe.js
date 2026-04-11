// src/routes/stripe.js
import { Router } from "express";
import { createCheckoutSession, constructWebhookEvent, PLANS } from "../services/stripe.js";
import supabase from "../services/supabase.js";
import { createClientAccount } from "../services/supabaseAdmin.js";
import { sendClientWelcomeEmail } from "../services/loops.js";

const router = Router();

// ─── POST /stripe/create-checkout ────────────────────────────────────────────
router.post("/create-checkout", async (req, res) => {
  try {
    const { plan, email, currency = "USD" } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ error: `Invalid plan: ${plan}. Must be starter, growth, or pro.` });
    }

    const baseUrl = process.env.APP_URL || "https://qualyleads-landing.netlify.app";

    const session = await createCheckoutSession({
      plan,
      currency,
      customerEmail: email || undefined,
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancelUrl: `${baseUrl}/#pricing`,
    });

    console.log(`💳 Checkout session created: ${plan} (${currency}) → ${session.id}`);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /stripe/webhook ─────────────────────────────────────────────────────
router.post("/webhook", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📩 Stripe event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const { plan, planName } = session.metadata || {};
      const email = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      console.log(`✅ New subscriber: ${email} → ${planName}`);

      if (email) {
        await supabase.from("subscribers").upsert({
          email, plan, plan_name: planName,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          status: "active",
        }, { onConflict: "email" });

        try {
          const { userId, isNew } = await createClientAccount({
            email,
            businessName: session.customer_details?.name || email,
            plan,
          });

          await supabase.from("subscribers")
            .update({ user_id: userId })
            .eq("email", email);

          const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : "https://web-production-7ffda.up.railway.app";

          const { data: clientData } = await supabase
            .from("clients")
            .select("id")
            .eq("email", email)
            .single();

          const webhookUrl = clientData?.id
            ? `${BACKEND_URL}/zapier/lead?client=${clientData.id}`
            : `${BACKEND_URL}/zapier/lead`;

          await sendClientWelcomeEmail({ email, businessName: session.customer_details?.name || email, webhookUrl });

          console.log(`🔐 Auth account ${isNew ? "created" : "already exists"} for ${email}`);
        } catch (authErr) {
          console.error(`⚠️ Auth creation failed for ${email}:`, authErr.message);
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      await supabase.from("subscribers")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", invoice.customer);
      console.log(`🔄 Subscription renewed: ${invoice.customer}`);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await supabase.from("subscribers")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", invoice.customer);
      console.log(`⚠️ Payment failed: ${invoice.customer}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await supabase.from("subscribers")
        .update({ status: "cancelled" })
        .eq("stripe_customer_id", subscription.customer);
      console.log(`❌ Subscription cancelled: ${subscription.customer}`);
      break;
    }

    default:
      console.log(`↩️ Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// ─── GET /stripe/plans ────────────────────────────────────────────────────────
router.get("/plans", (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      name: plan.name,
    })),
  });
});

export default router;
