// src/routes/stripe.js
import { Router } from "express";
import { createCheckoutSession, constructWebhookEvent, PLANS } from "../services/stripe.js";
import supabase from "../services/supabase.js";
import { createClientAccount } from "../services/supabaseAdmin.js";

const router = Router();

// ─── POST /stripe/create-checkout ─────────────────────────────────────────────
// Called when user clicks a pricing plan button on the landing page
router.post("/create-checkout", async (req, res) => {
  try {
    const { plan, email } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ error: `Invalid plan: ${plan}. Must be starter, growth, or pro.` });
    }

    const baseUrl = process.env.APP_URL || "https://qualyleads-landing.netlify.app";

    const session = await createCheckoutSession({
      plan,
      customerEmail: email || undefined,
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancelUrl:  `${baseUrl}/#pricing`,
    });

    console.log(`💳 Checkout session created: ${plan} → ${session.id}`);

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Checkout error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /stripe/webhook ──────────────────────────────────────────────────────
// Stripe calls this when payment events happen
// Must use raw body — do NOT use express.json() for this route
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

    // ── New subscription created (first payment successful) ──────────────────
    case "checkout.session.completed": {
      const session = event.data.object;
      const { plan, planName } = session.metadata || {};
      const email      = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      console.log(`✅ New subscriber: ${email} → ${planName}`);

      if (email) {
        // 1. Save to subscribers table
        await supabase.from("subscribers").upsert({
          email,
          plan,
          plan_name:              planName,
          stripe_customer_id:     customerId,
          stripe_subscription_id: subscriptionId,
          status:                 "active",
        }, { onConflict: "email" });

        // 2. Create Supabase auth account + send welcome/password setup email
        try {
          const { userId, isNew } = await createClientAccount({
            email,
            businessName: session.customer_details?.name || email,
            plan,
          });

          // 3. Link subscriber to their auth user
          await supabase.from("subscribers")
            .update({ user_id: userId })
            .eq("email", email);

          console.log(`🔐 Auth account ${isNew ? "created" : "already exists"} for ${email}`);
        } catch (authErr) {
          // Don't fail the webhook if auth creation fails
          console.error(`⚠️ Auth creation failed for ${email}:`, authErr.message);
        }
      }
      break;
    }

    // ── Subscription renewed (monthly payment) ───────────────────────────────
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      await supabase
        .from("subscribers")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);

      console.log(`🔄 Subscription renewed: ${customerId}`);
      break;
    }

    // ── Payment failed ────────────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      await supabase
        .from("subscribers")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", customerId);

      console.log(`⚠️ Payment failed: ${customerId}`);
      break;
    }

    // ── Subscription cancelled ────────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      await supabase
        .from("subscribers")
        .update({ status: "cancelled" })
        .eq("stripe_customer_id", customerId);

      console.log(`❌ Subscription cancelled: ${customerId}`);
      break;
    }

    default:
      console.log(`↩️  Unhandled event: ${event.type}`);
  }

  res.json({ received: true });
});

// ─── GET /stripe/plans ─────────────────────────────────────────────────────────
// Returns available plans (used by landing page)
router.get("/plans", (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id:     key,
      name:   plan.name,
      amount: plan.amount,
    })),
  });
});

export default router;
