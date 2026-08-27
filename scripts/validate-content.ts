import { ALL_CARDS, ALL_CARD_IDS, getCard } from "@/data/tarot/cards";
import { CORRESPONDENCES } from "@/data/correspondences/graph";
import { SOURCE_IDS, SOURCES } from "@/data/sources/manifest";
import { ASSETS } from "@/data/sources/assets";
import { SPREADS } from "@/data/spreads/spreads";
import { DOMAINS, INSIGHT_LENSES, TIME_PERSPECTIVES } from "@/data/intake/taxonomy";
import { SEED_PLACES } from "@/data/places/seed-places";

/**
 * `npm run validate-content` (spec §50 Phase 0 CI): referential integrity of
 * the content corpus — unique ids, valid source references, no orphan
 * edges, complete decan/major coverage.
 */

const problems: string[] = [];
const check = (condition: boolean, message: string) => {
  if (!condition) problems.push(message);
};

check(ALL_CARDS.length === 78, `deck has ${ALL_CARDS.length} cards, expected 78`);
check(new Set(ALL_CARD_IDS).size === 78, "duplicate card ids");
for (const card of ALL_CARDS) {
  check(card.uprightMeaning.length > 40, `${card.id}: upright meaning too short`);
  check(card.reversedMeaning.length > 40, `${card.id}: reversed meaning too short`);
  for (const ref of card.sourceRefs) {
    check(SOURCE_IDS.has(ref), `${card.id}: unknown source ${ref}`);
  }
}

const recordIds = new Set<string>();
for (const record of CORRESPONDENCES) {
  check(!recordIds.has(record.id), `duplicate correspondence id ${record.id}`);
  recordIds.add(record.id);
  for (const ref of record.sourceRefs) {
    check(SOURCE_IDS.has(ref), `${record.id}: unknown source ${ref}`);
  }
  for (const concept of [record.sourceConceptId, record.targetConceptId]) {
    if (concept.startsWith("card:")) {
      try {
        getCard(concept.slice(5));
      } catch {
        problems.push(`${record.id}: orphan card concept ${concept}`);
      }
    }
  }
  for (const conflict of record.conflictsWith ?? []) {
    check(
      CORRESPONDENCES.some((r) => r.id === conflict),
      `${record.id}: conflictsWith missing record ${conflict}`,
    );
  }
}
check(
  CORRESPONDENCES.filter((r) => r.relationshipType === "decan_of").length === 36,
  "expected 36 decan attributions",
);

for (const spread of SPREADS) {
  check(
    spread.positions.length === spread.cardCount,
    `${spread.id}: positions ≠ cardCount`,
  );
}
check(DOMAINS.length === 12, "expected 12 domains");
check(INSIGHT_LENSES.length === 10, "expected 10 insight lenses");
check(TIME_PERSPECTIVES.length === 5, "expected 5 time perspectives");
check(SEED_PLACES.length >= 100, "seed gazetteer unexpectedly small");
for (const source of SOURCES) {
  check(
    source.copyrightOrLicenseStatus.length > 0,
    `${source.id}: missing license status`,
  );
}
check(ASSETS.length > 0, "asset manifest is empty");
for (const asset of ASSETS) {
  check(asset.copyrightStatus.length > 0, `${asset.id}: missing copyright status`);
  check(
    /^\d{4}-\d{2}-\d{2}$/.test(asset.verificationDate),
    `${asset.id}: missing verification date`,
  );
}

if (problems.length > 0) {
  console.error(`Content validation FAILED (${problems.length} problems):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  `Content validation passed: ${ALL_CARDS.length} cards, ${CORRESPONDENCES.length} correspondences, ${SPREADS.length} spreads, ${SEED_PLACES.length} seed places.`,
);
