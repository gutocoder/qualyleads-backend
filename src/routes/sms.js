// routes/sms.js
// Handles inbound SMS replies from leads via Twilio webhook

import { Router } from "express";
import { generateReply } from "../services/openai.js";
import { sendSMS } from "../services/twilio.js";
import { getChatHistory, saveMessage } from "../services/supabase.js";
import { getBlueprint } from "../blueprints/index.js";

const router = Router();

// Twilio sends POST with form-encoded body
router.post("/reply", async (req, res) => {
  try {
    const { From: phone, Body: incomingMessage } = req.body;

    if (!phone || !incomingMessage) {
      return res.status(400).send("Missing phone or message.");
    }

    console.log(`\n📩 Reply from ${phone}: "${incomingMessage}"`);

    // ── 1. Retrieve chat history from Supabase ────────────────────────────
    const chat = await getChatHistory(phone);

    if (!chat) {
      console.warn(`⚠️ No lead found for ${phone}. Ignoring.`);
      return res.status(200).send("OK");
    }

    const { leadId, messages } = chat;

    // ── 2. Save inbound message ───────────────────────────────────────────
    await saveMessage({ lead_id: leadId, role: "user", content: incomingMessage });

    // ── 3. Get blueprint (we store industry in the lead row — re-fetch if needed)
    // For simplicity, we infer from history context. To be fully accurate,
    // you can join with the leads table in getChatHistory.
    const blueprint = getBlueprint(""); // defaults to general; extend getChatHistory to return industry

    // ── 4. Generate AI reply ──────────────────────────────────────────────
    const aiReply = await generateReply({
      blueprint,
      history: messages,
      incomingMessage,
    });

    console.log(`🤖 AI reply: "${aiReply}"`);

    // ── 5. Send reply SMS ─────────────────────────────────────────────────
    await sendSMS({ to: phone, message: aiReply });

    // ── 6. Save AI reply to DB ────────────────────────────────────────────
    await saveMessage({ lead_id: leadId, role: "assistant", content: aiReply });

    // Twilio expects a 200 response (optionally with TwiML)
    res.status(200).send("<Response></Response>");
  } catch (err) {
    console.error("❌ SMS reply error:", err.message);
    res.status(500).send("Error");
  }
});

export default router;
