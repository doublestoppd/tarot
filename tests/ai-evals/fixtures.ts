import type { CompilerInputs } from "@/domain/reading-compiler/compile";
import {
  computeConservativeDateOnly,
  computeCurrentSky,
  computeNatalChart,
  computeTransits,
} from "@/domain/astrology/engine";
import { numerologyProfile } from "@/domain/numerology/engine";
import { getSpread } from "@/data/spreads/spreads";
import { selectSpread } from "@/domain/tarot/spread-selection";
import type { DrawnCard } from "@/domain/tarot/types";
import type { ReadingSelections } from "@/domain/intake/types";

/**
 * Deterministic evaluation fixtures (spec §17.2): ≥100 synthetic
 * ReadingContext inputs covering sparse data, full natal data, conflicting
 * themes, weak/no resonance, boundary dates, relationship ambiguity,
 * financial domains, missing birth time, and strong Hermetic convergence.
 * No randomness — the suite is identical on every run.
 */

const MOMENT = new Date("2026-08-27T00:00:00Z");
const SKY = computeCurrentSky(MOMENT);

interface DrawSpec {
  id: string;
  cards: string[];
  reversed: number[];
}

const DRAWS: DrawSpec[] = [
  {
    id: "virgo_convergence",
    cards: ["major_09_hermit", "pentacles_08", "pentacles_09", "cups_02", "major_07_chariot"],
    reversed: [],
  },
  {
    id: "conflicting_currents",
    cards: ["major_10_wheel", "pentacles_04", "major_07_chariot", "swords_08", "cups_05"],
    reversed: [3],
  },
  {
    id: "no_majors_flat",
    cards: ["wands_06", "cups_09", "swords_02", "pentacles_07", "cups_03"],
    reversed: [],
  },
  {
    id: "court_meeting",
    cards: ["wands_queen", "swords_king", "cups_page", "pentacles_knight", "major_06_lovers"],
    reversed: [],
  },
  {
    id: "reversal_heavy",
    cards: ["major_16_tower", "swords_10", "cups_08", "wands_10", "major_13_death"],
    reversed: [0, 1, 2, 3],
  },
  {
    id: "fire_surge",
    cards: ["wands_01", "wands_06", "wands_knight", "major_19_sun", "major_00_fool"],
    reversed: [],
  },
  {
    id: "water_depths",
    cards: ["cups_04", "cups_07", "major_18_moon", "major_02_high_priestess", "cups_queen"],
    reversed: [1],
  },
  {
    id: "material_ground",
    cards: ["pentacles_04", "pentacles_06", "pentacles_10", "major_04_emperor", "swords_04"],
    reversed: [],
  },
  {
    id: "threshold_walk",
    cards: ["major_13_death", "swords_06", "cups_08", "major_17_star", "wands_03"],
    reversed: [],
  },
  {
    id: "quiet_ambiguity",
    cards: ["swords_02", "cups_04", "major_12_hanged_man", "pentacles_07", "swords_07"],
    reversed: [4],
  },
  {
    id: "hermetic_stack",
    cards: ["wands_05", "wands_06", "wands_07", "major_08_strength", "major_19_sun"],
    reversed: [],
  },
  {
    id: "connection_mixed",
    cards: ["cups_02", "swords_05", "major_06_lovers", "cups_06", "swords_03"],
    reversed: [1],
  },
];

interface SelectionSpec {
  id: string;
  selections: ReadingSelections;
}

const SELECTION_VARIANTS: SelectionSpec[] = [
  {
    id: "career_deep",
    selections: {
      domainId: "career",
      focusId: "new_direction",
      insightId: "broader_picture",
      timePerspectiveId: "present_developing",
      depth: "deep",
      reversalsEnabled: true,
    },
  },
  {
    id: "love_hidden",
    selections: {
      domainId: "love",
      focusId: "trust_uncertainty",
      insightId: "not_obvious",
      timePerspectiveId: "near_term",
      depth: "deep",
      reversalsEnabled: true,
    },
  },
  {
    id: "money_caution",
    selections: {
      domainId: "money",
      focusId: "risk_uncertainty",
      insightId: "caution",
      timePerspectiveId: "developing",
      depth: "deep",
      reversalsEnabled: true,
    },
  },
];

type BirthVariant = "none" | "date_only" | "exact";
const BIRTH_VARIANTS: BirthVariant[] = ["none", "date_only", "exact"];

const EXACT_CHART = computeNatalChart(new Date("1992-05-17T12:30:00Z"), {
  lat: 48.86,
  lon: 2.35,
});
const DATE_ONLY_PROFILE = computeConservativeDateOnly(1992, 5, 17);
const BOUNDARY_PROFILE = computeConservativeDateOnly(1990, 8, 23); // cusp date
const NUMEROLOGY = numerologyProfile({ year: 1992, month: 5, day: 17 }, MOMENT);
const BOUNDARY_NUMEROLOGY = numerologyProfile({ year: 1990, month: 8, day: 23 }, MOMENT);

export interface EvalFixture {
  id: string;
  inputs: CompilerInputs;
}

export function buildEvalFixtures(): EvalFixture[] {
  const fixtures: EvalFixture[] = [];
  for (const draw of DRAWS) {
    for (const selection of SELECTION_VARIANTS) {
      for (const birth of BIRTH_VARIANTS) {
        const spread = selectSpread(selection.selections);
        const cards: DrawnCard[] = draw.cards
          .slice(0, spread.cardCount)
          .map((cardId, drawIndex) => ({
            cardId,
            drawIndex,
            orientation: draw.reversed.includes(drawIndex)
              ? ("reversed" as const)
              : ("upright" as const),
          }));
        // Spreads larger than the base card list extend deterministically.
        const EXTRA = [
          "swords_09", "pentacles_02", "wands_04", "cups_10", "major_11_justice",
        ];
        while (cards.length < spread.cardCount) {
          const cardId = EXTRA[cards.length - draw.cards.length]!;
          cards.push({ cardId, drawIndex: cards.length, orientation: "upright" });
        }

        const inputs: CompilerInputs = {
          momentUtc: MOMENT.toISOString(),
          selections: selection.selections,
          spread,
          draw: { cards, reversalsEnabled: true },
          currentSky: SKY,
          natal:
            birth === "none"
              ? { kind: "none" }
              : birth === "date_only"
                ? { kind: "partial", profile: DATE_ONLY_PROFILE }
                : { kind: "exact", chart: EXACT_CHART },
          transits: birth === "exact" ? computeTransits(SKY, EXACT_CHART) : [],
          numerology: birth === "none" ? null : NUMEROLOGY,
          birthProvided: {
            date: birth !== "none",
            time: birth === "exact",
            place: birth === "exact",
          },
        };
        fixtures.push({ id: `${draw.id}__${selection.id}__${birth}`, inputs });
      }
    }
  }

  // Boundary-date fixture: sign-cusp birthday with unstable Sun.
  fixtures.push({
    id: "boundary_date__general__cusp",
    inputs: {
      momentUtc: MOMENT.toISOString(),
      selections: {
        domainId: "general",
        focusId: "general_overview",
        insightId: "broader_picture",
        timePerspectiveId: "none",
        depth: "focused",
        reversalsEnabled: false,
      },
      spread: getSpread("threefold_clarity"),
      draw: {
        cards: [
          { cardId: "major_21_world", drawIndex: 0, orientation: "upright" },
          { cardId: "swords_01", drawIndex: 1, orientation: "upright" },
          { cardId: "pentacles_03", drawIndex: 2, orientation: "upright" },
        ],
        reversalsEnabled: false,
      },
      currentSky: SKY,
      natal: { kind: "partial", profile: BOUNDARY_PROFILE },
      transits: [],
      numerology: BOUNDARY_NUMEROLOGY,
      birthProvided: { date: true, time: false, place: false },
    },
  });

  return fixtures;
}
