import type {
  DomainDefinition,
  InsightLensDefinition,
  TimePerspectiveDefinition,
} from "@/domain/intake/types";

/**
 * Structured intake taxonomy (spec §7). Ids are stable contract values;
 * labels are presentation and may be reworded freely.
 */

export const TAXONOMY_VERSION = "intake-1.0";

const f = (id: string, label: string, hints: string[] = []) => ({
  id,
  label,
  hints,
});

export const DOMAINS: DomainDefinition[] = [
  {
    id: "general",
    label: "General",
    focuses: [
      f("general_overview", "General overview"),
      f("current_atmosphere", "Current atmosphere"),
      f("what_deserves_attention", "What deserves attention", ["hidden"]),
      f("direction_development", "Direction and development", ["direction"]),
      f("balance_integration", "Balance and integration", ["balance"]),
    ],
  },
  {
    id: "love",
    label: "Love & Connection",
    focuses: [
      f("general_relationship_energy", "General relationship energy"),
      f("new_connection", "A new connection", ["beginnings"]),
      f("existing_connection", "An existing connection"),
      f("communication", "Communication", ["communication"]),
      f("trust_uncertainty", "Trust & uncertainty", ["hidden"]),
      f("compatibility_reciprocity", "Compatibility & reciprocity", ["balance"]),
      f("boundaries", "Boundaries", ["structure"]),
      f("change_direction", "Change & direction", ["change", "direction"]),
      f("letting_go", "Letting go", ["endings"]),
      f("personal_relationship_patterns", "Personal relationship patterns", [
        "patterns",
      ]),
    ],
  },
  {
    id: "career",
    label: "Career & Purpose",
    focuses: [
      f("general_direction", "General direction"),
      f("current_path", "Current path"),
      f("new_direction", "A new direction", ["beginnings", "direction"]),
      f("opportunity_growth", "Opportunity & growth", ["growth"]),
      f("stability", "Stability", ["stability"]),
      f("recognition_advancement", "Recognition & advancement"),
      f("leadership", "Leadership", ["authority"]),
      f("collaboration", "Collaboration", ["connection"]),
      f("conflict_obstacles", "Conflict & obstacles", ["conflict"]),
      f("purpose_fulfillment", "Purpose & fulfillment"),
      f("work_life_balance", "Work-life balance", ["balance"]),
    ],
  },
  {
    id: "money",
    label: "Money & Resources",
    focuses: [
      f("general_financial_pattern", "General financial pattern"),
      f("stability_security", "Stability & security", ["stability"]),
      f("opportunity", "Opportunity"),
      f("growth", "Growth", ["growth"]),
      f("spending_restraint", "Spending & restraint", ["restraint"]),
      f("saving_preparation", "Saving & preparation"),
      f("risk_uncertainty", "Risk & uncertainty", ["risk"]),
      f("resources_support", "Resources & support"),
      f("material_priorities", "Material priorities"),
    ],
  },
  {
    id: "home",
    label: "Home & Family",
    focuses: [
      f("general_home_family", "General home/family pattern"),
      f("belonging", "Belonging"),
      f("communication", "Communication", ["communication"]),
      f("boundaries", "Boundaries", ["structure"]),
      f("responsibility", "Responsibility"),
      f("change_in_home", "Change in the home", ["change"]),
      f("family_dynamics", "Family dynamics"),
      f("stability", "Stability", ["stability"]),
      f("roots_legacy", "Roots & legacy", ["cycles"]),
    ],
  },
  {
    id: "growth",
    label: "Personal Growth",
    focuses: [
      f("general_self_development", "General self-development"),
      f("identity", "Identity"),
      f("confidence", "Confidence"),
      f("boundaries", "Boundaries", ["structure"]),
      f("habits_patterns", "Habits & patterns", ["patterns"]),
      f("healing_integration", "Healing & integration", ["healing"]),
      f("shadow_work", "Shadow work", ["shadow", "hidden"]),
      f("self_expression", "Self-expression"),
      f("motivation", "Motivation"),
      f("fear_resistance", "Fear & resistance", ["resistance"]),
      f("letting_go", "Letting go", ["endings"]),
      f("transformation", "Transformation", ["transformation"]),
    ],
  },
  {
    id: "spiritual",
    label: "Spiritual Path",
    focuses: [
      f("general_guidance", "General guidance"),
      f("intuition", "Intuition", ["intuition"]),
      f("purpose", "Purpose"),
      f("inner_development", "Inner development"),
      f("synchronicity", "Synchronicity"),
      f("spiritual_practice", "Spiritual practice", ["discipline"]),
      f("shadow_integration", "Shadow & integration", ["shadow", "hidden"]),
      f("transformation", "Transformation", ["transformation"]),
      f("discernment", "Discernment", ["clarity"]),
    ],
  },
  {
    id: "change",
    label: "Change & Transition",
    focuses: [
      f("general_transition", "General transition"),
      f("beginning", "Beginning", ["beginnings"]),
      f("ending_release", "Ending & release", ["endings"]),
      f("uncertainty", "Uncertainty"),
      f("preparation", "Preparation"),
      f("adaptation", "Adaptation"),
      f("what_to_carry_forward", "What to carry forward"),
      f("what_to_leave_behind", "What to leave behind", ["endings"]),
      f("emerging_direction", "Emerging direction", ["direction"]),
    ],
  },
  {
    id: "creativity",
    label: "Creativity & Expression",
    focuses: [
      f("general_creative_energy", "General creative energy"),
      f("inspiration", "Inspiration"),
      f("creative_block", "Creative block", ["resistance"]),
      f("starting_project", "Starting a project", ["beginnings"]),
      f("developing_project", "Developing a project"),
      f("visibility_sharing", "Visibility & sharing"),
      f("collaboration", "Collaboration", ["connection"]),
      f("discipline_practice", "Discipline & practice", ["discipline"]),
      f("authentic_expression", "Authentic expression", ["truth"]),
    ],
  },
  {
    id: "decision",
    label: "Decisions & Direction",
    focuses: [
      f("general_direction", "General direction"),
      f("crossroads", "A crossroads", ["choice"]),
      f("competing_priorities", "Competing priorities", ["balance"]),
      f("what_is_not_obvious", "What is not obvious", ["hidden"]),
      f("what_supports_movement", "What supports movement", ["support"]),
      f("what_calls_for_caution", "What calls for caution", ["caution"]),
      f("shorter_term_direction", "Shorter-term direction"),
      f("longer_pattern", "Longer pattern", ["cycles"]),
    ],
  },
  {
    id: "conflict",
    label: "Conflict & Boundaries",
    focuses: [
      f("general_dynamics", "General dynamics"),
      f("communication", "Communication", ["communication"]),
      f("boundaries", "Boundaries", ["structure"]),
      f("power_control", "Power & control", ["power"]),
      f("misunderstanding", "Misunderstanding"),
      f("competing_needs", "Competing needs"),
      f("de_escalation", "De-escalation", ["harmony"]),
      f("what_needs_clarity", "What needs clarity", ["clarity"]),
      f("resolution_integration", "Resolution & integration", ["integration"]),
    ],
  },
  {
    id: "timing",
    label: "Timing & Cycles",
    focuses: [
      f("current_cycle", "Current cycle"),
      f("near_term_movement", "Near-term movement"),
      f("what_is_ripening", "What is ripening", ["growth"]),
      f("what_needs_time", "What needs time", ["waiting"]),
      f("recurring_pattern", "A recurring pattern", ["patterns", "cycles"]),
      f("transition_between_cycles", "Transition between cycles", ["change"]),
      f("longer_term_development", "Longer-term development"),
    ],
  },
];

export const INSIGHT_LENSES: InsightLensDefinition[] = [
  {
    id: "broader_picture",
    label: "The broader picture",
    effect: "balanced",
    description:
      "Synthesize the primary pattern without over-prioritizing hidden or obstacle factors.",
  },
  {
    id: "not_obvious",
    label: "What may not be obvious",
    effect: "hidden",
    description:
      "Raise the relevance of hidden, reversed, contradictory, unconscious, and background-position evidence without inventing secrets.",
  },
  {
    id: "influence",
    label: "What is influencing this most",
    effect: "influence",
    description:
      "Prioritize the strongest symbolic pressures and repeated factors.",
  },
  {
    id: "support",
    label: "What supports movement or growth",
    effect: "support",
    description:
      "Prioritize constructive and supportive positions, dignities, strengths, and stabilizers.",
  },
  {
    id: "resistance",
    label: "What may be creating resistance",
    effect: "resistance",
    description:
      "Prioritize restrictive, conflicting, reversed, or blocked patterns without diagnosing pathology.",
  },
  {
    id: "change",
    label: "What is changing",
    effect: "change",
    description:
      "Prioritize transition, movement, endings and beginnings, applying transits and temporal shifts.",
  },
  {
    id: "caution",
    label: "What deserves caution or care",
    effect: "caution",
    description:
      "Prioritize tension and risk symbolism while avoiding deterministic warnings.",
  },
  {
    id: "potential",
    label: "What potential is developing",
    effect: "potential",
    description:
      "Prioritize emerging, opening, and supportive symbols without guaranteeing outcomes.",
  },
  {
    id: "integration",
    label: "How to integrate what is present",
    effect: "integration",
    description:
      "Prioritize reconciliation of contradictory themes and practical synthesis.",
  },
  {
    id: "direction",
    label: "Where the current pattern may be leading",
    effect: "direction",
    description:
      "Discuss trajectory conditionally; never present the future as fixed fact.",
  },
];

export const TIME_PERSPECTIVES: TimePerspectiveDefinition[] = [
  {
    id: "present_developing",
    label: "Present and developing pattern",
    weighting: "balanced",
    description: "Balance current symbolism and applying near-term factors.",
  },
  {
    id: "near_term",
    label: "Near term",
    weighting: "near",
    description:
      "Favor current lunar and fast-planet factors and immediate spread positions; no exact dated predictions.",
  },
  {
    id: "developing",
    label: "Developing over time",
    weighting: "developing",
    description:
      "Favor medium-cycle transits, repeated themes, and movement across spread positions.",
  },
  {
    id: "longer",
    label: "Longer pattern",
    weighting: "longer",
    description:
      "Favor slower planets, persistent natal themes, Major Arcana, and durable cycles.",
  },
  {
    id: "none",
    label: "No particular timeframe",
    weighting: "none",
    description: "Reduce temporal weighting; emphasize symbolic structure.",
  },
];

export const DEFAULT_INSIGHT_ID = "broader_picture";
export const DEFAULT_TIME_PERSPECTIVE_ID = "present_developing";

export function findDomain(id: string): DomainDefinition | undefined {
  return DOMAINS.find((d) => d.id === id);
}
