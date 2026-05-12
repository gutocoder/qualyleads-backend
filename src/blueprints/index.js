// src/blueprints/index.js
// Central blueprint registry

import gymBlueprint from "./nl/gym.nl.js";
import plumberBlueprint from "./nl/plumber.nl.js";
import agencyBlueprint from "./nl/agency.nl.js";
import coachBlueprint from "./nl/coach.nl.js";
import hvacBlueprint from "./nl/hvac.nl.js";
import solarBlueprint from "./nl/solar.nl.js";
import recruitmentBlueprint from "./recruitment.js";
import uitzendBlueprint from "./Uitzend.js";

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

export function getBlueprint(industry, language = "nl") {
  const key = industry?.toLowerCase()?.trim();
  const blueprint = blueprints[key];

  if (!blueprint) {
    console.warn(`⚠️ No blueprint for industry: "${industry}" — using hvac fallback`);
    return hvacBlueprint;
  }

  return blueprint;
}

export default blueprints;
