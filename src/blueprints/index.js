// src/blueprints/index.js
// Central blueprint registry — add new industries here

import gymBlueprint from "./gym.js";
import plumberBlueprint from "./plumber.js";
import agencyBlueprint from "./agency.js";
import coachBlueprint from "./coach.js";
import hvacBlueprint from "./hvac.js";
import solarBlueprint from "./solar.js";
import recruitmentBlueprint from "./recruitment.js";
import uitzendBlueprint from "./uitzend.js";

const blueprints = {
  gym:         gymBlueprint,
  plumber:     plumberBlueprint,
  agency:      agencyBlueprint,
  coach:       coachBlueprint,
  hvac:        hvacBlueprint,
  solar:       solarBlueprint,
  recruitment: recruitmentBlueprint,
  uitzend:     uitzendBlueprint,
};

/**
 * Get blueprint by industry + language
 * Falls back to general if industry not found
 */
export function getBlueprint(industry, language = "nl") {
  const key = industry?.toLowerCase()?.trim();
  const blueprint = blueprints[key];

  if (!blueprint) {
    console.warn(`⚠️ No blueprint for industry: "${industry}" — using fallback`);
    return getFallbackBlueprint(language);
  }

  // Override language if blueprint supports it
  return { ...blueprint, language: language || blueprint.language };
}

function getFallbackBlueprint(language = "nl") {
  const isNL = language === "nl";
  return {
    industry: "general",
    aiName: "Qualy",
    language,
    systemPrompt: (businessName, bookingUrl) => isNL
      ? `Je bent Qualy, een vriendelijke AI-assistent van ${businessName}. Kwalificeer de lead en boek een afspraak via ${bookingUrl}. Houd berichten kort — dit is WhatsApp. Stel één vraag tegelijk.`
      : `You are Qualy, a friendly AI assistant for ${businessName}. Qualify the lead and book an appointment via ${bookingUrl}. Keep messages short — this is WhatsApp. Ask one question at a time.`,
    opener: (name) => isNL
      ? `Hoi ${name}! 👋 Ik ben Qualy. Hoe kan ik je helpen?`
      : `Hi ${name}! 👋 I'm Qualy. How can I help you today?`,
  };
}

export default blueprints;
