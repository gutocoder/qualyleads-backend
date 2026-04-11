// src/services/twilio.js
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send an SMS to a lead
 * Uses Dutch number for NL clients, US number for everyone else
 */
export async function sendSMS({ to, message, language = "en" }) {
  const from = language === "nl"
    ? process.env.TWILIO_PHONE_NUMBER_NL
    : process.env.TWILIO_PHONE_NUMBER_US;

  const result = await client.messages.create({ body: message, from, to });
  console.log(`📱 SMS sent to ${to} via ${from} | SID: ${result.sid}`);
  return result.sid;
}

/**
 * Validate that an inbound webhook is genuinely from Twilio
 */
export function validateTwilioRequest(req) {
  const twilioSignature = req.headers["x-twilio-signature"];
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );
}
