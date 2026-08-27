import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { findPgBin, startTestCluster, type TestCluster } from "./helpers/pg-cluster";
import { runMigrations } from "@/lib/db/migrate";
import { seedPlacesIfEmpty, searchPlaces, getPlace } from "@/lib/places/places";
import { prepareReading, PrepareError } from "@/lib/reading/prepare-service";
import { interpretReading } from "@/lib/reading/interpret-service";
import { FakeReadingSynthesizer } from "@/lib/openai/fake";
import type { AppSettings } from "@/lib/db/settings";
import type { ReadingSelections } from "@/domain/intake/types";
import { resetEnvCacheForTests } from "@/lib/config/env";

const pgAvailable = findPgBin() !== null;
const suite = pgAvailable ? describe : describe.skip;

process.env.DATABASE_URL = "postgresql://unused/unused";
process.env.AUTH_SIGNING_SECRET = "test-signing-secret-0123456789abcdef0123456789";
process.env.READING_TICKET_KEY_CURRENT = Buffer.alloc(32, 7).toString("base64");
process.env.RATE_LIMIT_PEPPER = "test-pepper-0123456789abcdef0123456789abcdef";
resetEnvCacheForTests();

const selections: ReadingSelections = {
  domainId: "career",
  focusId: "new_direction",
  insightId: "not_obvious",
  timePerspectiveId: "developing",
  depth: "deep",
  reversalsEnabled: true,
};

const settings = (over: Partial<AppSettings> = {}): AppSettings => ({
  accessCodeHash: null,
  adminSecretHash: null,
  sessionEpoch: 1,
  aiEnabled: true,
  unlockEnabled: true,
  aiProvider: "openai",
  aiModel: "gpt-5.6-luna",
  dailyBudgetMicro: 2_000_000,
  monthlyBudgetMicro: 30_000_000,
  maxReadingCostMicro: 50_000,
  maxRepairCostMicro: 50_000,
  perInstallHourly: 6,
  perInstallDaily: 20,
  globalAiConcurrency: 3,
  shareTtlDays: 90,
  ...over,
});

suite("reading pipeline (prepare → interpret)", () => {
  let cluster: TestCluster;
  let pool: Pool;

  beforeAll(async () => {
    cluster = await startTestCluster();
    pool = cluster.pool;
    await runMigrations(pool);
    await seedPlacesIfEmpty(pool);
  });

  afterAll(async () => {
    await cluster?.stop();
  });

  it("place search finds canonical rows; unknown ids are rejected", async () => {
    const results = await searchPlaces(pool, "par");
    expect(results.some((p) => p.name === "Paris")).toBe(true);
    const paris = await getPlace(pool, "seed:paris_fr");
    expect(paris?.timezone).toBe("Europe/Paris");
    await expect(
      prepareReading(pool, {
        selections,
        birth: { date: { year: 1992, month: 5, day: 17 }, placeId: "seed:nowhere_xx" },
      }),
    ).rejects.toThrow(PrepareError);
  });

  it("prepares an anonymous reading and interprets it once", async () => {
    const prepared = await prepareReading(pool, { selections });
    expect(prepared.ticket.startsWith("pt1.")).toBe(true);
    // career + new_direction at deep depth selects the 6-card Career Path.
    expect(prepared.context.reading.cards.length).toBe(6);
    expect(prepared.context.reading.spread.id).toBe("career_path");
    expect(prepared.deterministicFallback.paragraphs.length).toBeGreaterThan(3);

    const outcome = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_a",
      synthesizerOverride: new FakeReadingSynthesizer("ok"),
    });
    expect(outcome.kind).toBe("ai");
    if (outcome.kind !== "ai") return;
    expect(outcome.synthesis.paragraphs.length).toBeGreaterThanOrEqual(5);

    // Second interpretation of the same reading is refused (one-call rule).
    const second = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_a",
      synthesizerOverride: new FakeReadingSynthesizer("ok"),
    });
    expect(second).toEqual({ kind: "error", code: "READING_TICKET_EXPIRED" });
  });

  it("prepares an exact-birth reading with houses and transits", async () => {
    const prepared = await prepareReading(pool, {
      selections,
      birth: {
        date: { year: 1992, month: 5, day: 17 },
        time: { hour: 14, minute: 30 },
        placeId: "seed:paris_fr",
      },
    });
    expect(prepared.context.capability.fullNatalChart).toBe(true);
    expect(prepared.context.capability.natalHouses).toBe(true);
    const facts = prepared.context.personalFactors.map((f) => f.displayFact).join("|");
    expect(facts).toContain("Rising sign");
  });

  it("rejects DST-gap birth times and requires a choice for ambiguous ones", async () => {
    await expect(
      prepareReading(pool, {
        selections,
        birth: {
          date: { year: 2021, month: 3, day: 14 },
          time: { hour: 2, minute: 30 },
          placeId: "seed:new_york_us",
        },
      }),
    ).rejects.toMatchObject({ code: "BIRTH_TIME_NONEXISTENT" });

    await expect(
      prepareReading(pool, {
        selections,
        birth: {
          date: { year: 2021, month: 11, day: 7 },
          time: { hour: 1, minute: 30 },
          placeId: "seed:new_york_us",
        },
      }),
    ).rejects.toMatchObject({ code: "BIRTH_TIME_AMBIGUOUS" });

    const notSure = await prepareReading(pool, {
      selections,
      birth: {
        date: { year: 2021, month: 11, day: 7 },
        time: { hour: 1, minute: 30 },
        placeId: "seed:new_york_us",
        dstAmbiguityChoice: "not_sure",
      },
    });
    // Both instants covered; differing factors suppressed, houses withheld.
    expect(notSure.context.capability.fullNatalChart).toBe(false);
    expect(notSure.context.capability.natalHouses).toBe(false);

    const secondOccurrence = await prepareReading(pool, {
      selections,
      birth: {
        date: { year: 2021, month: 11, day: 7 },
        time: { hour: 1, minute: 30 },
        placeId: "seed:new_york_us",
        dstAmbiguityChoice: "second",
      },
    });
    expect(secondOccurrence.context.capability.fullNatalChart).toBe(true);
  });

  it("provider interruption releases the reservation and allows retry", async () => {
    const prepared = await prepareReading(pool, { selections });
    const failed = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_retry",
      synthesizerOverride: new FakeReadingSynthesizer("fail"),
    });
    expect(failed).toEqual({ kind: "error", code: "AI_PROVIDER_INTERRUPTED" });

    const retried = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_retry",
      synthesizerOverride: new FakeReadingSynthesizer("ok"),
    });
    expect(retried.kind).toBe("ai");
  });

  it("the configured internal provider serves full readings from the in-house composer", async () => {
    const prepared = await prepareReading(pool, { selections });
    const outcome = await interpretReading(
      pool,
      settings({ aiProvider: "internal" }),
      {
        ticket: prepared.ticket,
        rateKeyHash: "install_internal",
      },
    );
    expect(outcome.kind).toBe("ai");
    if (outcome.kind !== "ai") return;
    expect(outcome.synthesis.paragraphs.length).toBeGreaterThanOrEqual(5);
    // Fully validated output: every cited id exists in the compiled context.
    const { validateSynthesis } = await import("@/domain/safety/validate");
    expect(validateSynthesis(outcome.synthesis, prepared.context).ok).toBe(true);
  });

  it("falls back deterministically when AI is disabled — same cards, no charge", async () => {
    const prepared = await prepareReading(pool, { selections });
    const outcome = await interpretReading(pool, settings({ aiEnabled: false }), {
      ticket: prepared.ticket,
      rateKeyHash: "install_disabled",
    });
    expect(outcome.kind).toBe("deterministic");
    if (outcome.kind !== "deterministic") return;
    expect(outcome.reason).toBe("ai_disabled");
    const cardNames = prepared.context.reading.cards.map((c) => c.name);
    const text = outcome.synthesis.paragraphs.map((p) => p.text).join(" ");
    expect(text).toContain(cardNames[0]!);
  });

  it("falls back deterministically when the budget window is closed", async () => {
    const prepared = await prepareReading(pool, { selections });
    const outcome = await interpretReading(
      pool,
      settings({ dailyBudgetMicro: 10_000 }), // below the 50k reservation
      {
        ticket: prepared.ticket,
        rateKeyHash: "install_budget",
        synthesizerOverride: new FakeReadingSynthesizer("ok"),
      },
    );
    expect(outcome.kind).toBe("deterministic");
    if (outcome.kind !== "deterministic") return;
    expect(outcome.reason).toBe("budget");
  });

  it("unusable output consumes the single repair and then serves the deterministic reading", async () => {
    const prepared = await prepareReading(pool, { selections });
    const outcome = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_invalid",
      synthesizerOverride: new FakeReadingSynthesizer("invalid"),
    });
    expect(outcome.kind).toBe("deterministic");
    if (outcome.kind !== "deterministic") return;
    expect(outcome.reason).toBe("validation");
    const reservations = await pool.query<{ kind: string; status: string }>(
      `SELECT kind, status FROM budget_reservations ORDER BY created_at DESC LIMIT 2`,
    );
    const kinds = reservations.rows.map((r) => r.kind).sort();
    expect(kinds).toEqual(["normal", "repair"]);
    const failures = await pool.query<{ validation_failures: number }>(
      "SELECT validation_failures FROM usage_daily",
    );
    expect(failures.rows[0]!.validation_failures).toBeGreaterThanOrEqual(2);
  });

  it("enforces per-install hourly ceilings with reading-oriented refusal", async () => {
    const tight = settings({ perInstallHourly: 1 });
    const first = await prepareReading(pool, { selections });
    const ok = await interpretReading(pool, tight, {
      ticket: first.ticket,
      rateKeyHash: "install_ceiling",
      synthesizerOverride: new FakeReadingSynthesizer("ok"),
    });
    expect(ok.kind).toBe("ai");
    const secondPrep = await prepareReading(pool, { selections });
    const refused = await interpretReading(pool, tight, {
      ticket: secondPrep.ticket,
      rateKeyHash: "install_ceiling",
      synthesizerOverride: new FakeReadingSynthesizer("ok"),
    });
    expect(refused).toEqual({ kind: "error", code: "RATE_TEMPORARILY_UNAVAILABLE" });
  });

  it("expired tickets close gracefully", async () => {
    const prepared = await prepareReading(pool, { selections }, new Date(Date.now() - 60 * 60_000));
    const outcome = await interpretReading(pool, settings(), {
      ticket: prepared.ticket,
      rateKeyHash: "install_expired",
    });
    expect(outcome).toEqual({ kind: "error", code: "READING_TICKET_EXPIRED" });
  });
});
