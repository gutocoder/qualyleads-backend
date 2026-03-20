// src/routes/zapier.js
// Public endpoint for Zapier — no secret header required
// Zapier sends leads from Facebook/Instagram/Typeform etc.

import { Router } from "express";
import { getBlueprint } from "../blueprints/index.js";
import { generateOpener } from "../services/openai.js";
import { sendSMS } from "../services/twilio.js";
import { saveLead } from "../services/supabase.js";

const router = Router();

// ─── POST /zapier/lead ────────────────────────────────────────────────────────
// Zapier sends lead data here from Facebook/Instagram Lead Ads
router.post("/lead", async (req, res) => {
  try {
    // Zapier can send data in different formats — handle all of them
    const body = req.body;

    // Extract fields — support multiple naming conventions
    const name     = body.name
                  || body.full_name
                  || body.first_name
                  || "there";

    const phone    = body.phone
                  || body.phone_number
                  || body.mobile
                  || body.contact_phone;

    const industry = body.industry
                  || body.business_type
                  || body.source
                  || "general";

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    console.log(`\n⚡ Zapier lead: ${name} | ${phone} | ${industry}`);

    // Select blueprint
    const blueprint = getBlueprint(industry);
    console.log(`📋 Blueprint: ${blueprint.industry}`);

    // Generate AI opener
    const aiMessage = await generateOpener({ name, industry, blueprint });
    console.log(`🤖 Message: "${aiMessage}"`);

    // Send SMS
    await sendSMS({ to: phone, message: aiMessage });

    // Save to Supabase
    const leadId = await saveLead({ name, phone, industry, blueprint, aiMessage });
    console.log(`💾 Saved | ID: ${leadId}`);

    // Zapier expects a 200 with some data back
    res.status(200).json({
      success: true,
      leadId,
      message: "Lead processed and SMS sent.",
      preview: aiMessage,
    });

  } catch (err) {
    console.error("❌ Zapier webhook error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /zapier/health ───────────────────────────────────────────────────────
// Zapier pings this to verify the connection is working
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "QualyLeads Zapier Integration",
    version: "1.0",
    supported_fields: {
      required: ["phone"],
      optional: ["name", "industry"],
    },
  });
});

export default router;
