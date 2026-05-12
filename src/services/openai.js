// services/openai.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Replace {{placeholders}} in a blueprint systemPrompt string
 */
function resolveSystemPrompt(blueprint, { name, bookingUrl, businessName }) {
  let prompt = blueprint.systemPrompt || "";

  // Replace all placeholders
  prompt = prompt
    .replace(/\{\{leadName\}\}/g, name || "there")
    .replace(/\{\{businessName\}\}/g, businessName || "us")
    .replace(/\{\{bookingUrl\}\}/g, bookingUrl || "https://calendly.com/gustavoadade-1/qualyleads-demo-call");

  return prompt;
}

/**
 * Generate the first outbound message for a new lead
 */
export async function generateOpener({ name, industry, blueprint, bookingUrl, businessName }) {
  const systemPrompt = resolveSystemPrompt(blueprint, { name, bookingUrl, businessName });

  const userPrompt = `
A new lead just came in:
- Name: ${name}
- Industry: ${industry}

Generate the opening WhatsApp/SMS message to send to ${name}.
Keep it under 160 characters. Friendly, warm, end with ONE question.
Do NOT use excessive emojis. Sound human, not robotic.
  `.trim();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
    max_tokens: 200,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Generate a reply to an inbound message from a lead
 */
export async function generateReply({ name, industry, blueprint, history, incomingMessage, bookingUrl, businessName }) {
  const systemPrompt = resolveSystemPrompt(blueprint, { name, bookingUrl, businessName });

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: incomingMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0].message.content.trim();
}
