import type {
  SpreadDefinition,
  SpreadPositionDefinition,
} from "@/domain/tarot/types";

/**
 * Spread catalog (spec §8). Spread definitions are data, not UI; automatic
 * selection rules live in domain/tarot/spread-selection.ts.
 */

export const SPREADS_VERSION = "spreads-1.0";

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
      "A compact reading of the present pattern, its key influence, and the direction developing from them.",
    domainAffinity: [],
    positions: [
      pos(0, "present_pattern", "Present pattern", "The central current of the situation now.", "primary", ["broader_picture", "influence"]),
      pos(1, "key_influence", "Key influence", "The factor bearing most directly on the pattern.", "standard", ["influence"]),
      pos(2, "developing_direction", "Developing direction", "Where the pattern tends as it develops.", "standard", ["direction", "change", "potential"]),
    ],
  },
  {
    id: "fivefold_insight",
    name: "Fivefold Insight",
    cardCount: 5,
    depth: "deep",
    description:
      "The default deep spread: present pattern, its hidden factor, what supports, what resists, and the developing direction.",
    domainAffinity: [],
    positions: [
      pos(0, "present_pattern", "Present pattern", "The central current of the situation now.", "primary", ["broader_picture", "influence"]),
      pos(1, "hidden_factor", "Hidden factor", "What operates beneath the visible pattern.", "standard", ["not_obvious"]),
      pos(2, "support", "Support", "What steadies or strengthens movement.", "standard", ["support", "potential"]),
      pos(3, "resistance", "Resistance", "What restrains, complicates, or pushes back.", "standard", ["resistance", "caution"]),
      pos(4, "developing_direction", "Developing direction", "Where the pattern tends as it develops.", "standard", ["direction", "change"]),
    ],
  },
  {
    id: "crossroads",
    name: "Crossroads",
    cardCount: 5,
    depth: "deep",
    description:
      "For decisions and uncertain turnings: the present orientation, the pulls toward change and continuity, the unseen factor, and the integrating direction.",
    domainAffinity: ["decision", "change"],
    positions: [
      pos(0, "current_orientation", "Current orientation", "Where you presently stand at the crossing.", "primary", ["broader_picture"]),
      pos(1, "pull_change", "Pull toward change", "The current drawing toward a different path.", "standard", ["change", "potential"]),
      pos(2, "pull_continuity", "Pull toward continuity", "The current drawing toward the familiar path.", "standard", ["support"]),
      pos(3, "unseen_factor", "Unseen factor", "What bears on the choice without announcing itself.", "standard", ["not_obvious"]),
      pos(4, "integrating_direction", "Integrating direction", "The direction that can hold what both pulls know.", "standard", ["integration", "direction"]),
    ],
  },
  {
    id: "career_path",
    name: "Career Path",
    cardCount: 6,
    depth: "deep",
    description:
      "Work and purpose in six positions: the current professional pattern, its strengths and constraints, the live opportunity, what asks to be developed, and direction.",
    domainAffinity: ["career"],
    positions: [
      pos(0, "current_pattern", "Current professional pattern", "The present shape of work and vocation.", "primary", ["broader_picture", "influence"]),
      pos(1, "strength_resource", "Strength / resource", "What is dependable and can be drawn on.", "standard", ["support"]),
      pos(2, "constraint", "Constraint", "What limits or presses on the professional pattern.", "standard", ["resistance", "caution"]),
      pos(3, "opportunity", "Opportunity", "The opening that is realistically present.", "standard", ["potential"]),
      pos(4, "to_develop", "What to develop", "The capacity that would change the pattern if grown.", "standard", ["potential", "integration"]),
      pos(5, "direction", "Direction", "Where the professional pattern tends.", "standard", ["direction"]),
    ],
  },
  {
    id: "connection_dynamics",
    name: "Connection Dynamics",
    cardCount: 6,
    depth: "deep",
    description:
      "Relational atmosphere without asserting another person's private motives: what is expressed, what is less visible, support, tension, and the developing dynamic.",
    domainAffinity: ["love"],
    positions: [
      pos(0, "relational_atmosphere", "Current relational atmosphere", "The shared weather of the connection.", "primary", ["broader_picture"]),
      pos(1, "expressed", "What is expressed", "What moves in the open between the parties.", "standard", ["influence"]),
      pos(2, "less_visible", "What is less visible", "What shapes the dynamic from beneath the surface.", "standard", ["not_obvious"]),
      pos(3, "support", "Support", "What steadies the connection.", "standard", ["support"]),
      pos(4, "tension", "Tension", "Where the dynamic strains or contradicts itself.", "standard", ["resistance", "caution"]),
      pos(5, "developing_dynamic", "Developing dynamic", "How the connection's pattern is developing.", "standard", ["direction", "change"]),
    ],
  },
  {
    id: "threshold",
    name: "Threshold",
    cardCount: 7,
    depth: "deep",
    description:
      "For transitions: what is ending, what remains, what is emerging, the resource and resistance of the crossing, the adjustment it asks, and its direction.",
    domainAffinity: ["change"],
    positions: [
      pos(0, "ending", "What is ending", "The chapter completing itself.", "primary", ["change"]),
      pos(1, "remains", "What remains", "What persists across the threshold.", "standard", ["support"]),
      pos(2, "emerging", "What is emerging", "The new pattern taking form.", "standard", ["potential", "change"]),
      pos(3, "resource", "Resource", "What can be drawn on during the crossing.", "standard", ["support"]),
      pos(4, "resistance", "Resistance", "What drags against the transition.", "standard", ["resistance"]),
      pos(5, "adjustment", "Adjustment", "The recalibration the crossing asks for.", "standard", ["integration", "caution"]),
      pos(6, "threshold_direction", "Threshold direction", "Where the crossing tends to lead.", "standard", ["direction"]),
    ],
  },
  {
    id: "deep_pattern",
    name: "Deep Pattern",
    cardCount: 7,
    depth: "deep",
    description:
      "For recurring cycles and shadow work: surface and root of the pattern, its repetition, the blind spot, the resource, and the integration and direction available.",
    domainAffinity: ["growth", "spiritual"],
    positions: [
      pos(0, "surface_pattern", "Surface pattern", "How the pattern shows itself in daily life.", "primary", ["broader_picture"]),
      pos(1, "root_pattern", "Root pattern", "The older structure beneath the surface.", "standard", ["not_obvious"]),
      pos(2, "repetition", "Repetition", "How the pattern renews itself.", "standard", ["influence"]),
      pos(3, "blind_spot", "Blind spot", "What the pattern keeps out of view.", "standard", ["not_obvious"]),
      pos(4, "resource", "Resource", "What is available for working with the pattern.", "standard", ["support"]),
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
      "The classical elements as a diagnostic frame: action, feeling, thought, and material ground, integrated at the center.",
    domainAffinity: ["general", "growth"],
    positions: [
      pos(0, "fire_action", "Fire — action", "The state of will, drive, and initiative.", "standard", ["influence"]),
      pos(1, "water_feeling", "Water — feeling", "The state of feeling and relation.", "standard", ["influence"]),
      pos(2, "air_thought", "Air — thought", "The state of thought and language.", "standard", ["influence"]),
      pos(3, "earth_material", "Earth — material", "The state of body, work, and ground.", "standard", ["influence"]),
      pos(4, "integration", "Integration", "How the four currents combine at present.", "primary", ["integration", "broader_picture"]),
    ],
  },
  {
    id: "cycle_lens",
    name: "Cycle Lens",
    cardCount: 7,
    depth: "deep",
    description:
      "Timing and cycles: the cycle now, recent movement, what ripens and what wanes, support, caution, and the next phase.",
    domainAffinity: ["timing"],
    positions: [
      pos(0, "cycle_now", "Cycle now", "The phase currently underway.", "primary", ["broader_picture"]),
      pos(1, "recent_movement", "Recent movement", "What has just shifted.", "background", ["change"]),
      pos(2, "ripening", "What is ripening", "What approaches readiness.", "standard", ["potential"]),
      pos(3, "waning", "What is waning", "What recedes and asks to be released.", "standard", ["change"]),
      pos(4, "support", "Support", "What steadies this phase.", "standard", ["support"]),
      pos(5, "caution", "Caution", "What deserves care during this phase.", "standard", ["caution"]),
      pos(6, "next_phase", "Next phase", "The phase gathering beyond this one.", "standard", ["direction"]),
    ],
  },
  {
    id: "celtic_cross",
    name: "Celtic Cross",
    cardCount: 10,
    depth: "comprehensive",
    description:
      "The full traditional survey: present and crossing influence, foundation and recent past, conscious aim and near development, self, environment, hopes and fears, and trajectory — read conditionally, never as fixed fate.",
    domainAffinity: [],
    positions: [
      pos(0, "present", "Present", "The heart of the matter now.", "primary", ["broader_picture"]),
      pos(1, "crossing", "Crossing influence", "What crosses and complicates the present.", "primary", ["resistance", "influence"]),
      pos(2, "foundation", "Foundation", "The basis beneath the situation.", "background", ["not_obvious"]),
      pos(3, "recent_past", "Recent past", "What is passing out of the pattern.", "background", ["change"]),
      pos(4, "conscious_aim", "Conscious aim", "What is held in view and worked toward.", "standard", ["influence"]),
      pos(5, "near_development", "Near development", "What approaches in the near pattern.", "standard", ["change", "potential"]),
      pos(6, "self", "Self", "One's own stance within the situation.", "standard", ["broader_picture"]),
      pos(7, "environment", "Environment", "The surrounding field and its actors.", "standard", ["influence"]),
      pos(8, "hopes_fears", "Hopes and fears", "The doubled current of hope and fear.", "standard", ["not_obvious", "caution"]),
      pos(9, "outcome_trajectory", "Outcome / trajectory", "The conditional trajectory of the whole pattern.", "standard", ["direction", "potential"]),
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
