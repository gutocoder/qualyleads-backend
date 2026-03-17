// services/openai.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate the first outbound SMS message for a new lead
 */
export async function generateOpener({ name, industry, blueprint }) {
  const systemPrompt = buildSystemPrompt(blueprint);

  const userPrompt = `
A new lead has just come in. Here are their details:
- Name: ${name}
- Industry context: ${industry}

Write the first SMS message to send to ${name}. 
Remember: SMS only — keep it under 160 characters, friendly, and end with a clear question or CTA.
Do NOT use emojis excessively. Sound human.
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
 * Generate a reply to an inbound SMS from a lead
 * @param {Object} params
 * @param {string} params.name - Lead's name
 * @param {string} params.industry - Lead's industry
 * @param {Object} params.blueprint - The industry blueprint
 * @param {Array}  params.history - Array of {role, content} messages
 * @param {string} params.incomingMessage - The lead's latest reply
 */
export async function generateReply({ name, industry, blueprint, history, incomingMessage }) {
  const systemPrompt = buildSystemPrompt(blueprint);

  // Build the full conversation for GPT context
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

function buildSystemPrompt(blueprint) {
  return `
You are ${blueprint.persona}

YOUR GOAL: ${blueprint.goal}

TONE: ${blueprint.tone}

GUIDELINES:
${blueprint.context}

OPENING STRATEGY: ${blueprint.openingStrategy}

IMPORTANT RULES:
- You are communicating via SMS. Keep ALL messages under 160 characters.
- Never reveal you are an AI unless directly asked.
- If asked if you are an AI or a bot, say you're a real person helping out.
- Stay on topic. Always steer toward the goal.
- Be warm, never pushy or spammy.
- One clear CTA per message maximum.
  `.trim();
}
