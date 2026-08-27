import type {
  SpreadDefinition,
  SpreadPositionDefinition,
} from "@/domain/tarot/types";

/**
 * Spread catalog (spec §8). Spread definitions are data, not UI; automatic
 * selection rules live in domain/tarot/spread-selection.ts.
 * Descriptions and purposes follow the plain-language rule (ADR 0009).
 */

export const SPREADS_VERSION = "spreads-1.1";

function pos(
  index: number,
  id: string,
  label: string,
  purpose: string,
  emphasis: SpreadPositionDefinition["emphasis"] = "standard",
  insightAffinity: string[] = [],
): SpreadPositionDefinition {
  return { index, id, label, purpose, emphasis, insightAffinity };
}

export const SPREADS: SpreadDefinition[] = [
  {
    id: "threefold_clarity",
    name: "Threefold Clarity",
    cardCount: 3,
    depth: "focused",
    description:
      "A compact reading. It shows the present pattern, the key influence on it, and the direction things are taking.",
    domainAffinity: [],
    positions: [
      pos(0, "present_pattern", "Present pattern", "The main current running through the situation now.", "primary", ["broader_picture", "influence"]),
      pos(1, "key_influence", "Key influence", "The thing pressing on the situation most directly.", "standard", ["influence"]),
      pos(2, "developing_direction", "Developing direction", "Where things are heading as the pattern develops.", "standard", ["direction", "change", "potential"]),
    ],
  },
  {
    id: "fivefold_insight",
    name: "Fivefold Insight",
    cardCount: 5,
    depth: "deep",
    description:
      "The default deep spread. It maps the present pattern, its hidden factor, what supports it, what resists it, and where it is heading.",
    domainAffinity: [],
    positions: [
      pos(0, "present_pattern", "Present pattern", "The main current running through the situation now.", "primary", ["broader_picture", "influence"]),
      pos(1, "hidden_factor", "Hidden factor", "What is at work under the surface.", "standard", ["not_obvious"]),
      pos(2, "support", "Support", "What steadies you or helps things move.", "standard", ["support", "potential"]),
      pos(3, "resistance", "Resistance", "What holds things back or pushes against them.", "standard", ["resistance", "caution"]),
      pos(4, "developing_direction", "Developing direction", "Where things are heading as the pattern develops.", "standard", ["direction", "change"]),
    ],
  },
  {
    id: "crossroads",
    name: "Crossroads",
    cardCount: 5,
    depth: "deep",
    description:
      "For decisions and uncertain turns. It shows where you stand, the pull toward change, and the pull toward the familiar. It also names the unseen factor and a direction that can hold both.",
    domainAffinity: ["decision", "change"],
    positions: [
      pos(0, "current_orientation", "Current orientation", "Where you stand right now at this crossing.", "primary", ["broader_picture"]),
      pos(1, "pull_change", "Pull toward change", "The pull toward a different path.", "standard", ["change", "potential"]),
      pos(2, "pull_continuity", "Pull toward continuity", "The pull toward the familiar path.", "standard", ["support"]),
      pos(3, "unseen_factor", "Unseen factor", "What weighs on the choice without announcing itself.", "standard", ["not_obvious"]),
      pos(4, "integrating_direction", "Integrating direction", "The direction that can honor both pulls.", "standard", ["integration", "direction"]),
    ],
  },
  {
    id: "career_path",
    name: "Career Path",
    cardCount: 6,
    depth: "deep",
    description:
      "Work and purpose in six positions. It maps the current pattern, strengths, limits, the live opening, what to grow, and direction.",
    domainAffinity: ["career"],
    positions: [
      pos(0, "current_pattern", "Current professional pattern", "The present shape of your work life.", "primary", ["broader_picture", "influence"]),
      pos(1, "strength_resource", "Strength / resource", "What you can count on and draw from.", "standard", ["support"]),
      pos(2, "constraint", "Constraint", "What limits or presses on your work.", "standard", ["resistance", "caution"]),
      pos(3, "opportunity", "Opportunity", "The opening that is really there.", "standard", ["potential"]),
      pos(4, "to_develop", "What to develop", "The skill or strength that would change things if it grew.", "standard", ["potential", "integration"]),
      pos(5, "direction", "Direction", "Where your work life is heading.", "standard", ["direction"]),
    ],
  },
  {
    id: "connection_dynamics",
    name: "Connection Dynamics",
    cardCount: 6,
    depth: "deep",
    description:
      "The mood between people, without guessing anyone's private motives. It looks at what is in the open and what is less visible. It also tracks support, tension, and how the connection is growing.",
    domainAffinity: ["love"],
    positions: [
      pos(0, "relational_atmosphere", "Current relational atmosphere", "The shared weather of the connection.", "primary", ["broader_picture"]),
      pos(1, "expressed", "What is expressed", "What moves in the open between you.", "standard", ["influence"]),
      pos(2, "less_visible", "What is less visible", "What shapes things from under the surface.", "standard", ["not_obvious"]),
      pos(3, "support", "Support", "What steadies the connection.", "standard", ["support"]),
      pos(4, "tension", "Tension", "Where the connection strains or works against itself.", "standard", ["resistance", "caution"]),
      pos(5, "developing_dynamic", "Developing dynamic", "How the connection is changing over time.", "standard", ["direction", "change"]),
    ],
  },
  {
    id: "threshold",
    name: "Threshold",
    cardCount: 7,
    depth: "deep",
    description:
      "For times of change. It shows what is ending, what remains, what is emerging, the resource and the resistance, the adjustment asked for, and the direction.",
    domainAffinity: ["change"],
    positions: [
      pos(0, "ending", "What is ending", "The chapter that is closing.", "primary", ["change"]),
      pos(1, "remains", "What remains", "What carries over across the threshold.", "standard", ["support"]),
      pos(2, "emerging", "What is emerging", "The new pattern taking form.", "standard", ["potential", "change"]),
      pos(3, "resource", "Resource", "What you can draw on during the crossing.", "standard", ["support"]),
      pos(4, "resistance", "Resistance", "What drags against the change.", "standard", ["resistance"]),
      pos(5, "adjustment", "Adjustment", "The adjustment the crossing asks for.", "standard", ["integration", "caution"]),
      pos(6, "threshold_direction", "Threshold direction", "Where the crossing tends to lead.", "standard", ["direction"]),
    ],
  },
  {
    id: "deep_pattern",
    name: "Deep Pattern",
    cardCount: 7,
    depth: "deep",
    description:
      "For cycles that keep coming back. It maps the surface and the root of the pattern, how it repeats, and the blind spot. It also names the resource, the way to hold it all, and the direction.",
    domainAffinity: ["growth", "spiritual"],
    positions: [
      pos(0, "surface_pattern", "Surface pattern", "How the pattern shows itself in daily life.", "primary", ["broader_picture"]),
      pos(1, "root_pattern", "Root pattern", "The older root under the surface.", "standard", ["not_obvious"]),
      pos(2, "repetition", "Repetition", "How the pattern keeps itself going.", "standard", ["influence"]),
      pos(3, "blind_spot", "Blind spot", "What the pattern keeps out of view.", "standard", ["not_obvious"]),
      pos(4, "resource", "Resource", "What you have to work with.", "standard", ["support"]),
      pos(5, "integration", "Integration", "How the opposing parts can be held together.", "standard", ["integration"]),
      pos(6, "direction", "Direction", "Where work on the pattern tends to lead.", "standard", ["direction", "potential"]),
    ],
  },
  {
    id: "elemental_balance",
    name: "Elemental Balance",
    cardCount: 5,
    depth: "deep",
    description:
      "The four classical elements as a check-up frame. Action, feeling, thought, and practical ground, drawn together at the center.",
    domainAffinity: ["general", "growth"],
    positions: [
      pos(0, "fire_action", "Fire — action", "The state of your drive and will to act.", "standard", ["influence"]),
      pos(1, "water_feeling", "Water — feeling", "The state of feeling and connection.", "standard", ["influence"]),
      pos(2, "air_thought", "Air — thought", "The state of thought and words.", "standard", ["influence"]),
      pos(3, "earth_material", "Earth — material", "The state of body, work, and practical ground.", "standard", ["influence"]),
      pos(4, "integration", "Integration", "How the four currents mix right now.", "primary", ["integration", "broader_picture"]),
    ],
  },
  {
    id: "cycle_lens",
    name: "Cycle Lens",
    cardCount: 7,
    depth: "deep",
    description:
      "Timing and cycles. It tracks the phase now, recent movement, what ripens, what fades, support, caution, and the next phase.",
    domainAffinity: ["timing"],
    positions: [
      pos(0, "cycle_now", "Cycle now", "The phase you are in now.", "primary", ["broader_picture"]),
      pos(1, "recent_movement", "Recent movement", "What has just shifted.", "background", ["change"]),
      pos(2, "ripening", "What is ripening", "What is coming ripe.", "standard", ["potential"]),
      pos(3, "waning", "What is waning", "What is fading and asks to be let go.", "standard", ["change"]),
      pos(4, "support", "Support", "What steadies this phase.", "standard", ["support"]),
      pos(5, "caution", "Caution", "What deserves care during this phase.", "standard", ["caution"]),
      pos(6, "next_phase", "Next phase", "The phase building beyond this one.", "standard", ["direction"]),
    ],
  },
  {
    id: "celtic_cross",
    name: "Celtic Cross",
    cardCount: 10,
    depth: "comprehensive",
    description:
      "The full traditional survey in ten positions, from the heart of the matter to its trajectory. It is read as a living pattern, never as fixed fate.",
    domainAffinity: [],
    positions: [
      pos(0, "present", "Present", "The heart of the matter now.", "primary", ["broader_picture"]),
      pos(1, "crossing", "Crossing influence", "What crosses the present and makes it harder.", "primary", ["resistance", "influence"]),
      pos(2, "foundation", "Foundation", "The base under the situation.", "background", ["not_obvious"]),
      pos(3, "recent_past", "Recent past", "What is passing out of the pattern.", "background", ["change"]),
      pos(4, "conscious_aim", "Conscious aim", "What you are aiming at on purpose.", "standard", ["influence"]),
      pos(5, "near_development", "Near development", "What is coming up soon in the pattern.", "standard", ["change", "potential"]),
      pos(6, "self", "Self", "Your own stance in the situation.", "standard", ["broader_picture"]),
      pos(7, "environment", "Environment", "The people and setting around the situation.", "standard", ["influence"]),
      pos(8, "hopes_fears", "Hopes and fears", "Hope and fear, running as one current.", "standard", ["not_obvious", "caution"]),
      pos(9, "outcome_trajectory", "Outcome / trajectory", "Where the whole pattern points if nothing shifts.", "standard", ["direction", "potential"]),
    ],
  },
];

const byId = new Map(SPREADS.map((s) => [s.id, s]));

export function getSpread(id: string): SpreadDefinition {
  const spread = byId.get(id);
  if (!spread) {
    throw new Error(`Unknown spread id: ${id}`);
  }
  return spread;
}
