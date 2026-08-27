import type {
  AcceptanceClass,
  CorrespondenceRecord,
  RelationshipType,
  TraditionId,
} from "@/domain/correspondences/types";

/**
 * The v1 correspondence graph (spec §12).
 *
 * Records are generated from compact factual tables so referential integrity
 * is testable. Facts follow the Golden Dawn/Hermetic canon (Book T, the
 * historical trump attributions) and classical Western astrology; wording of
 * any user-facing description remains original.
 */

export const CORRESPONDENCES_VERSION = "correspondences-1.0";

const V = CORRESPONDENCES_VERSION;

const CLASS_WEIGHT: Record<AcceptanceClass, number> = {
  A: 1.0,
  B: 0.8,
  C: 0.5,
  D: 0.3,
  X: 0.4,
};

function rec(
  id: string,
  sourceConceptId: string,
  relationshipType: RelationshipType,
  targetConceptId: string,
  traditionId: TraditionId,
  acceptanceClass: AcceptanceClass,
  sourceRefs: string[],
  extra?: Partial<CorrespondenceRecord>,
): CorrespondenceRecord {
  return {
    id,
    sourceConceptId,
    targetConceptId,
    relationshipType,
    traditionId,
    acceptanceClass,
    sourceRefs,
    baseWeight: CLASS_WEIGHT[acceptanceClass],
    version: V,
    active: true,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Major arcana: Golden Dawn astrological attribution + Hebrew letter + path
// ---------------------------------------------------------------------------

interface MajorRow {
  card: string;
  attribution: string; // planet:* | sign:* | element:*
  hebrew: string;
  hebrewName: string;
  path: number; // Tree of Life path 11..32
}

const MAJORS: MajorRow[] = [
  { card: "major_00_fool", attribution: "element:air", hebrew: "aleph", hebrewName: "Aleph", path: 11 },
  { card: "major_01_magician", attribution: "planet:mercury", hebrew: "beth", hebrewName: "Beth", path: 12 },
  { card: "major_02_high_priestess", attribution: "planet:moon", hebrew: "gimel", hebrewName: "Gimel", path: 13 },
  { card: "major_03_empress", attribution: "planet:venus", hebrew: "daleth", hebrewName: "Daleth", path: 14 },
  { card: "major_04_emperor", attribution: "sign:aries", hebrew: "heh", hebrewName: "Heh", path: 15 },
  { card: "major_05_hierophant", attribution: "sign:taurus", hebrew: "vav", hebrewName: "Vav", path: 16 },
  { card: "major_06_lovers", attribution: "sign:gemini", hebrew: "zayin", hebrewName: "Zayin", path: 17 },
  { card: "major_07_chariot", attribution: "sign:cancer", hebrew: "cheth", hebrewName: "Cheth", path: 18 },
  { card: "major_08_strength", attribution: "sign:leo", hebrew: "teth", hebrewName: "Teth", path: 19 },
  { card: "major_09_hermit", attribution: "sign:virgo", hebrew: "yod", hebrewName: "Yod", path: 20 },
  { card: "major_10_wheel", attribution: "planet:jupiter", hebrew: "kaph", hebrewName: "Kaph", path: 21 },
  { card: "major_11_justice", attribution: "sign:libra", hebrew: "lamed", hebrewName: "Lamed", path: 22 },
  { card: "major_12_hanged_man", attribution: "element:water", hebrew: "mem", hebrewName: "Mem", path: 23 },
  { card: "major_13_death", attribution: "sign:scorpio", hebrew: "nun", hebrewName: "Nun", path: 24 },
  { card: "major_14_temperance", attribution: "sign:sagittarius", hebrew: "samekh", hebrewName: "Samekh", path: 25 },
  { card: "major_15_devil", attribution: "sign:capricorn", hebrew: "ayin", hebrewName: "Ayin", path: 26 },
  { card: "major_16_tower", attribution: "planet:mars", hebrew: "peh", hebrewName: "Peh", path: 27 },
  { card: "major_17_star", attribution: "sign:aquarius", hebrew: "tzaddi", hebrewName: "Tzaddi", path: 28 },
  { card: "major_18_moon", attribution: "sign:pisces", hebrew: "qoph", hebrewName: "Qoph", path: 29 },
  { card: "major_19_sun", attribution: "planet:sun", hebrew: "resh", hebrewName: "Resh", path: 30 },
  { card: "major_20_judgement", attribution: "element:fire", hebrew: "shin", hebrewName: "Shin", path: 31 },
  { card: "major_21_world", attribution: "planet:saturn", hebrew: "tav", hebrewName: "Tav", path: 32 },
];

// ---------------------------------------------------------------------------
// Minor arcana pips 2..10: Book T decan attributions
// ---------------------------------------------------------------------------

interface DecanRow {
  card: string;
  sign: string;
  decanIndex: 1 | 2 | 3;
  ruler: string;
}

const DECANS: DecanRow[] = [
  // Wands (fire signs)
  { card: "wands_02", sign: "aries", decanIndex: 1, ruler: "mars" },
  { card: "wands_03", sign: "aries", decanIndex: 2, ruler: "sun" },
  { card: "wands_04", sign: "aries", decanIndex: 3, ruler: "venus" },
  { card: "wands_05", sign: "leo", decanIndex: 1, ruler: "saturn" },
  { card: "wands_06", sign: "leo", decanIndex: 2, ruler: "jupiter" },
  { card: "wands_07", sign: "leo", decanIndex: 3, ruler: "mars" },
  { card: "wands_08", sign: "sagittarius", decanIndex: 1, ruler: "mercury" },
  { card: "wands_09", sign: "sagittarius", decanIndex: 2, ruler: "moon" },
  { card: "wands_10", sign: "sagittarius", decanIndex: 3, ruler: "saturn" },
  // Cups (water signs)
  { card: "cups_02", sign: "cancer", decanIndex: 1, ruler: "venus" },
  { card: "cups_03", sign: "cancer", decanIndex: 2, ruler: "mercury" },
  { card: "cups_04", sign: "cancer", decanIndex: 3, ruler: "moon" },
  { card: "cups_05", sign: "scorpio", decanIndex: 1, ruler: "mars" },
  { card: "cups_06", sign: "scorpio", decanIndex: 2, ruler: "sun" },
  { card: "cups_07", sign: "scorpio", decanIndex: 3, ruler: "venus" },
  { card: "cups_08", sign: "pisces", decanIndex: 1, ruler: "saturn" },
  { card: "cups_09", sign: "pisces", decanIndex: 2, ruler: "jupiter" },
  { card: "cups_10", sign: "pisces", decanIndex: 3, ruler: "mars" },
  // Swords (air signs)
  { card: "swords_02", sign: "libra", decanIndex: 1, ruler: "moon" },
  { card: "swords_03", sign: "libra", decanIndex: 2, ruler: "saturn" },
  { card: "swords_04", sign: "libra", decanIndex: 3, ruler: "jupiter" },
  { card: "swords_05", sign: "aquarius", decanIndex: 1, ruler: "venus" },
  { card: "swords_06", sign: "aquarius", decanIndex: 2, ruler: "mercury" },
  { card: "swords_07", sign: "aquarius", decanIndex: 3, ruler: "moon" },
  { card: "swords_08", sign: "gemini", decanIndex: 1, ruler: "jupiter" },
  { card: "swords_09", sign: "gemini", decanIndex: 2, ruler: "mars" },
  { card: "swords_10", sign: "gemini", decanIndex: 3, ruler: "sun" },
  // Pentacles (earth signs)
  { card: "pentacles_02", sign: "capricorn", decanIndex: 1, ruler: "jupiter" },
  { card: "pentacles_03", sign: "capricorn", decanIndex: 2, ruler: "mars" },
  { card: "pentacles_04", sign: "capricorn", decanIndex: 3, ruler: "sun" },
  { card: "pentacles_05", sign: "taurus", decanIndex: 1, ruler: "mercury" },
  { card: "pentacles_06", sign: "taurus", decanIndex: 2, ruler: "moon" },
  { card: "pentacles_07", sign: "taurus", decanIndex: 3, ruler: "saturn" },
  { card: "pentacles_08", sign: "virgo", decanIndex: 1, ruler: "sun" },
  { card: "pentacles_09", sign: "virgo", decanIndex: 2, ruler: "venus" },
  { card: "pentacles_10", sign: "virgo", decanIndex: 3, ruler: "mercury" },
];

// ---------------------------------------------------------------------------
// Courts, aces, suits
// ---------------------------------------------------------------------------

const SUIT_ELEMENT: Record<string, string> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth",
};

/** Sub-element by rank (modern simplification of the Golden Dawn court scheme). */
const COURT_SUB_ELEMENT: Record<string, string> = {
  page: "earth",
  knight: "fire",
  queen: "water",
  king: "air",
};

/**
 * Primary zodiacal association for knights/queens/kings — a modern
 * school-specific simplification of Book T's 20°–20° spans (class C). Pages
 * carry no sign: they are the elemental "thrones" of their suit.
 */
const COURT_SIGN: Record<string, string> = {
  wands_knight: "sagittarius",
  wands_queen: "aries",
  wands_king: "leo",
  cups_knight: "pisces",
  cups_queen: "cancer",
  cups_king: "scorpio",
  swords_knight: "gemini",
  swords_queen: "libra",
  swords_king: "aquarius",
  pentacles_knight: "virgo",
  pentacles_queen: "capricorn",
  pentacles_king: "taurus",
};

/** Pip rank -> sephira (Golden Dawn Tree of Life mapping, class A). */
const SEPHIROTH: Array<{ rank: number; sephira: number; name: string }> = [
  { rank: 1, sephira: 1, name: "Kether" },
  { rank: 2, sephira: 2, name: "Chokmah" },
  { rank: 3, sephira: 3, name: "Binah" },
  { rank: 4, sephira: 4, name: "Chesed" },
  { rank: 5, sephira: 5, name: "Geburah" },
  { rank: 6, sephira: 6, name: "Tiphareth" },
  { rank: 7, sephira: 7, name: "Netzach" },
  { rank: 8, sephira: 8, name: "Hod" },
  { rank: 9, sephira: 9, name: "Yesod" },
  { rank: 10, sephira: 10, name: "Malkuth" },
];

// ---------------------------------------------------------------------------
// Zodiac: element, modality, traditional ruler (classical astrology, class A)
// ---------------------------------------------------------------------------

const SIGNS: Array<{
  sign: string;
  element: string;
  modality: string;
  ruler: string;
}> = [
  { sign: "aries", element: "fire", modality: "cardinal", ruler: "mars" },
  { sign: "taurus", element: "earth", modality: "fixed", ruler: "venus" },
  { sign: "gemini", element: "air", modality: "mutable", ruler: "mercury" },
  { sign: "cancer", element: "water", modality: "cardinal", ruler: "moon" },
  { sign: "leo", element: "fire", modality: "fixed", ruler: "sun" },
  { sign: "virgo", element: "earth", modality: "mutable", ruler: "mercury" },
  { sign: "libra", element: "air", modality: "cardinal", ruler: "venus" },
  { sign: "scorpio", element: "water", modality: "fixed", ruler: "mars" },
  { sign: "sagittarius", element: "fire", modality: "mutable", ruler: "jupiter" },
  { sign: "capricorn", element: "earth", modality: "cardinal", ruler: "saturn" },
  { sign: "aquarius", element: "air", modality: "fixed", ruler: "saturn" },
  { sign: "pisces", element: "water", modality: "mutable", ruler: "jupiter" },
];

// ---------------------------------------------------------------------------
// Record assembly
// ---------------------------------------------------------------------------

function buildRecords(): CorrespondenceRecord[] {
  const records: CorrespondenceRecord[] = [];

  for (const m of MAJORS) {
    const short = m.card.replace("major_", "m");
    records.push(
      rec(
        `cor_${short}_attr`,
        `card:${m.card}`,
        "attributed_to",
        m.attribution,
        "golden_dawn",
        "A",
        ["src_book_t_1893", "src_liber_777_1909"],
        { historicalPeriod: "1888–1900 (Hermetic Order of the Golden Dawn)" },
      ),
      rec(
        `cor_${short}_hebrew`,
        `card:${m.card}`,
        "hebrew_letter",
        `hebrew:${m.hebrew}`,
        "hermetic_qabalah",
        "A",
        ["src_liber_777_1909", "src_sepher_yetzirah_westcott_1887"],
        { notes: `Letter ${m.hebrewName} (Hermetic Qabalah usage; distinct from Jewish Kabbalah).` },
      ),
      rec(
        `cor_${short}_path`,
        `card:${m.card}`,
        "tree_path",
        `path:${m.path}`,
        "hermetic_qabalah",
        "A",
        ["src_liber_777_1909"],
      ),
    );
  }

  // Documented disagreement (class X): some post-Golden-Dawn schools exchange
  // the letters of The Star and The Emperor (Tzaddi/Heh). The GD attribution
  // above remains primary; the disagreement is preserved, never collapsed.
  records.push(
    rec(
      "cor_x_star_heh_variant",
      "card:major_17_star",
      "hebrew_letter",
      "hebrew:heh",
      "modern_eclectic",
      "X",
      ["src_liber_777_1909"],
      {
        notes:
          "Thelemic-derived variant swaps Tzaddi/Heh between The Star and The Emperor. Preserved as a documented alternative; not used for scoring.",
        conflictsWith: ["cor_m17_star_hebrew", "cor_m04_emperor_hebrew"],
        active: false,
      },
    ),
  );

  for (const d of DECANS) {
    const decanId = `decan:${d.sign}_${d.decanIndex}`;
    records.push(
      rec(
        `cor_${d.card}_decan`,
        `card:${d.card}`,
        "decan_of",
        decanId,
        "golden_dawn",
        "A",
        ["src_book_t_1893"],
      ),
    );
  }
  // Decan structure records (sign + ruler), deduplicated by decan.
  const seenDecans = new Set<string>();
  for (const d of DECANS) {
    const decanId = `decan:${d.sign}_${d.decanIndex}`;
    if (seenDecans.has(decanId)) continue;
    seenDecans.add(decanId);
    records.push(
      rec(
        `cor_${d.sign}_${d.decanIndex}_sign`,
        decanId,
        "decan_sign",
        `sign:${d.sign}`,
        "golden_dawn",
        "A",
        ["src_book_t_1893"],
      ),
      rec(
        `cor_${d.sign}_${d.decanIndex}_ruler`,
        decanId,
        "decan_ruler",
        `planet:${d.ruler}`,
        "golden_dawn",
        "A",
        ["src_book_t_1893"],
        { notes: "Chaldean-order decan rulership as tabulated in Book T." },
      ),
    );
  }

  for (const suit of Object.keys(SUIT_ELEMENT)) {
    const element = SUIT_ELEMENT[suit]!;
    records.push(
      rec(
        `cor_suit_${suit}_element`,
        `suit:${suit}`,
        "suit_element",
        `element:${element}`,
        "golden_dawn",
        "A",
        ["src_book_t_1893", "src_waite_pkt_1911"],
      ),
      rec(
        `cor_${suit}_ace_root`,
        `card:${suit}_01`,
        "attributed_to",
        `element:${element}`,
        "golden_dawn",
        "A",
        ["src_book_t_1893"],
        { notes: "Ace as the root of its element." },
      ),
    );
    for (const rank of Object.keys(COURT_SUB_ELEMENT)) {
      const sub = COURT_SUB_ELEMENT[rank]!;
      records.push(
        rec(
          `cor_${suit}_${rank}_subelement`,
          `card:${suit}_${rank}`,
          "court_element",
          `element:${sub}`,
          "golden_dawn",
          "B",
          ["src_book_t_1893"],
          {
            notes:
              "Sub-element pairing (rank-element of suit-element), simplified from the Golden Dawn court scheme in RWS rank naming.",
          },
        ),
      );
    }
  }

  for (const [cardId, sign] of Object.entries(COURT_SIGN)) {
    records.push(
      rec(
        `cor_${cardId}_sign`,
        `card:${cardId}`,
        "court_sign",
        `sign:${sign}`,
        "golden_dawn",
        "C",
        ["src_book_t_1893"],
        {
          notes:
            "School-specific simplification of the Book T 20°–20° court spans to a primary sign; conventions differ between schools.",
        },
      ),
    );
  }

  for (const s of SEPHIROTH) {
    records.push(
      rec(
        `cor_pip_${s.rank}_sephira`,
        `number:${s.rank}`,
        "sephira",
        `sephira:${s.sephira}`,
        "hermetic_qabalah",
        "A",
        ["src_book_t_1893", "src_liber_777_1909"],
        { notes: `Pip rank ${s.rank} ↔ ${s.name} (Hermetic Qabalah).` },
      ),
    );
  }

  for (const s of SIGNS) {
    records.push(
      rec(
        `cor_sign_${s.sign}_element`,
        `sign:${s.sign}`,
        "sign_element",
        `element:${s.element}`,
        "western_astrology",
        "A",
        ["src_ptolemy_tetrabiblos"],
      ),
      rec(
        `cor_sign_${s.sign}_modality`,
        `sign:${s.sign}`,
        "sign_modality",
        `modality:${s.modality}`,
        "western_astrology",
        "A",
        ["src_ptolemy_tetrabiblos"],
      ),
      rec(
        `cor_sign_${s.sign}_ruler`,
        `sign:${s.sign}`,
        "sign_ruler",
        `planet:${s.ruler}`,
        "western_astrology",
        "A",
        ["src_ptolemy_tetrabiblos"],
        { notes: "Traditional seven-planet rulership (primary per spec §10.2)." },
      ),
    );
  }

  return records;
}

export const CORRESPONDENCES: readonly CorrespondenceRecord[] = buildRecords();

const bySource = new Map<string, CorrespondenceRecord[]>();
for (const record of CORRESPONDENCES) {
  if (!record.active) continue;
  const list = bySource.get(record.sourceConceptId) ?? [];
  list.push(record);
  bySource.set(record.sourceConceptId, list);
}

/** Active records whose source concept is the given id. */
export function correspondencesFor(conceptId: string): CorrespondenceRecord[] {
  return bySource.get(conceptId) ?? [];
}

export function correspondenceById(id: string): CorrespondenceRecord | undefined {
  return CORRESPONDENCES.find((r) => r.id === id);
}
