// src/services/twilio.js
import twilio from "twilio";
import { sendWhatsApp } from "./whatsapp.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const US_NUMBER  = process.env.TWILIO_PHONE_NUMBER_US;
const NL_NUMBER  = process.env.TWILIO_PHONE_NUMBER_NL;

/**
 * Send a message via SMS (Twilio) or WhatsApp (Meta Cloud API)
 * @param {string} to       - recipient E.164 phone number
 * @param {string} message  - text to send
 * @param {string} language - "en" | "nl"
 * @param {string} channel  - "sms" | "whatsapp" (default: "sms")
 */
export async function sendSMS({ to, message, language = "en", channel = "sms" }) {
  // Route to WhatsApp if requested
  if (channel === "whatsapp") {
    return sendWhatsApp({ to, message });
  }

  // SMS via Twilio — pick number by language
  const from = language === "nl" ? NL_NUMBER : US_NUMBER;

  if (!from) {
    throw new Error(`No Twilio number configured for language: ${language}`);
  }

  const result = await client.messages.create({
    body: message,
    from,
    to,
  });

  console.log(`✅ SMS sent | SID: ${result.sid} | from: ${from} | to: ${to}`);
  return result;
}
