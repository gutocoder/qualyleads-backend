// src/routes/zapier.js
import { Router } from "express";
import { getBlueprint } from "../blueprints/index.js";
import { generateOpener } from "../services/openai.js";
import { sendSMS } from "../services/twilio.js";
import { saveLead } from "../services/supabase.js";

const router = Router();

// ─── POST /zapier/lead ────────────────────────────────────────────────────────
router.post("/lead", async (req, res) => {
  try {
    const body = req.body;

    const clientId = req.query.client || body.client_id || null;
    const name = body.name || body.full_name || body.first_name || "there";
    const phone = body.phone || body.phone_number || body.mobile || body.contact_phone;
    const industry = body.industry || body.business_type || body.source || "general";
    const email = body.email || body.email_address || null;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    console.log(`\n⚡ Zapier lead: ${name} | ${phone} | ${industry} | client: ${clientId || "none"}`);

    // Look up client record to get language + booking URL
    let resolvedIndustry = industry;
    let language = "en";
    let bookingUrl = "https://calendly.com/gustavoadade-1/qualyleads-demo-call";

    if (clientId) {
      const supabase = (await import("../services/supabase.js")).default;
      const { data: client } = await supabase
        .from("clients")
        .select("industry, booking_url, language")
        .eq("id", clientId)
        .single();

      if (client?.industry) resolvedIndustry = client.industry;
      if (client?.language) language = client.language;
      if (client?.booking_url) bookingUrl = client.booking_url;
    }

    // Select blueprint based on industry AND language
    const blueprint = getBlueprint(resolvedIndustry, language);
    console.log(`📋 Blueprint: ${blueprint.industry} | Language: ${language}`);

    // Generate AI opener
    const aiMessage = await generateOpener({ name, industry: resolvedIndustry, blueprint, bookingUrl });
    console.log(`🤖 Message: "${aiMessage}"`);

    // Send SMS via correct number based on language
    await sendSMS({ to: phone, message: aiMessage, language });

    // Save to Supabase
    const leadId = await saveLead({ name, phone, email, industry: resolvedIndustry, blueprint, aiMessage, clientId });
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
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "QualyLeads Zapier Integration",
    version: "2.0",
    supported_fields: {
      required: ["phone"],
      optional: ["name", "industry"],
    },
  });
});

export default router;
