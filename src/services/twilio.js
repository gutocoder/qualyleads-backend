// services/twilio.js
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send an SMS to a lead
 */
export async function sendSMS({ to, message }) {
  const result = await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });

  console.log(`📱 SMS sent to ${to} | SID: ${result.sid}`);
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
