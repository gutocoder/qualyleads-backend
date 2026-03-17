// routes/webhook.js
// Triggered when a new lead comes in (from your CRM, form, or Zapier)

import { Router } from "express";
import { getBlueprint } from "../blueprints/index.js";
import { generateOpener } from "../services/openai.js";
import { sendSMS } from "../services/twilio.js";
import { saveLead } from "../services/supabase.js";

const router = Router();

router.post("/lead", async (req, res) => {
  try {
    // ── 1. Extract lead data ──────────────────────────────────────────────
    const { name, phone, industry } = req.body;

    if (!name || !phone || !industry) {
      return res.status(400).json({
        error: "Missing required fields: name, phone, industry",
      });
    }

    console.log(`\n🎯 New lead: ${name} | ${phone} | ${industry}`);

    // ── 2. Select Logic Blueprint ─────────────────────────────────────────
    const blueprint = getBlueprint(industry);
    console.log(`📋 Blueprint selected: ${blueprint.industry}`);

    // ── 3. Generate AI opener via GPT-4o ──────────────────────────────────
    const aiMessage = await generateOpener({ name, industry, blueprint });
    console.log(`🤖 AI message: "${aiMessage}"`);

    // ── 4. Send SMS via Twilio ────────────────────────────────────────────
    await sendSMS({ to: phone, message: aiMessage });

    // ── 5. Save to Supabase ───────────────────────────────────────────────
    const leadId = await saveLead({ name, phone, industry, blueprint, aiMessage });
    console.log(`💾 Lead saved to DB | ID: ${leadId}`);

    res.status(200).json({
      success: true,
      leadId,
      message: "Lead processed and SMS sent.",
      preview: aiMessage,
    });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
