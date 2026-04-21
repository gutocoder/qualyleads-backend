// src/services/whatsapp.js
// Meta Cloud API — WhatsApp Business

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const TOKEN = process.env.META_WHATSAPP_TOKEN;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Send a WhatsApp message via Meta Cloud API
 * @param {string} to - recipient phone number in E.164 format e.g. +31612345678
 * @param {string} message - text message to send
 */
export async function sendWhatsApp({ to, message }) {
  if (!PHONE_NUMBER_ID || !TOKEN) {
    throw new Error("META_PHONE_NUMBER_ID or META_WHATSAPP_TOKEN not set in env");
  }

  // Normalize phone number — remove spaces and ensure + prefix
  const phone = to.replace(/\s/g, "").startsWith("+") ? to.replace(/\s/g, "") : `+${to.replace(/\s/g, "")}`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ WhatsApp send error:", JSON.stringify(data));
    throw new Error(`WhatsApp API error: ${data?.error?.message || res.statusText}`);
  }

  console.log(`✅ WhatsApp sent to ${phone} | message_id: ${data?.messages?.[0]?.id}`);
  return data;
}
