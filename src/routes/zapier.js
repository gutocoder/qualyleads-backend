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
// Client ID is passed as query param: /zapier/lead?client=CLIENT_ID
router.post("/lead", async (req, res) => {
  try {
    const body = req.body;

    // Extract client_id from query param or body
    const clientId = req.query.client || body.client_id || null;

    // Extract fields — support multiple naming conventions
    const name     = body.name || body.full_name || body.first_name || "there";
    const phone    = body.phone || body.phone_number || body.mobile || body.contact_phone;
    const industry = body.industry || body.business_type || body.source || "general";

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    console.log(`\n⚡ Zapier lead: ${name} | ${phone} | ${industry} | client: ${clientId || "none"}`);

    // If clientId provided, look up the client's industry and Calendly from DB
    let resolvedIndustry = industry;
    if (clientId) {
      const supabase = (await import("../services/supabase.js")).default;
      const { data: client } = await supabase
        .from("clients")
        .select("industry, calendly_url")
        .eq("id", clientId)
        .single();
      if (client?.industry) resolvedIndustry = client.industry;
    }

    // Select blueprint
    const blueprint = getBlueprint(resolvedIndustry);
    console.log(`📋 Blueprint: ${blueprint.industry}`);

    // Generate AI opener
    const aiMessage = await generateOpener({ name, industry: resolvedIndustry, blueprint });
    console.log(`🤖 Message: "${aiMessage}"`);

    // Send SMS
    await sendSMS({ to: phone, message: aiMessage });

    // Save to Supabase with client_id
    const leadId = await saveLead({ name, phone, industry: resolvedIndustry, blueprint, aiMessage, clientId });
    console.log(`💾 Saved | ID: ${leadId}`);

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
