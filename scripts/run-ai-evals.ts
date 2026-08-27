import { buildEvalFixtures } from "@/tests/ai-evals/fixtures";
import {
  compileReadingContext,
  resetCompilerForTests,
} from "@/domain/reading-compiler/compile";
import { validateSynthesis } from "@/domain/safety/validate";
import type { ReadingSynthesizer } from "@/domain/reading-compiler/synthesizer";
import { FakeReadingSynthesizer } from "@/lib/openai/fake";

/**
 * AI evaluation harness (spec §17.2, §42.4). Runs the fixed fixture suite
 * through a synthesizer and grades every output with the deterministic
 * validation gates plus suite-level checks (specificity/swap, no-resonance
 * behavior). By default the deterministic fake adapter is graded — proving
 * harness + gates; set RUN_REAL_EVALS=1 with OPENAI_API_KEY to grade the
 * real model before enabling it in production. Fixture inputs are synthetic;
 * no real user data is ever used (spec §46).
 */

interface EvalRecord {
  id: string;
  ok: boolean;
  fatal: string[];
  repairable: string[];
  words: number;
  text: string;
}

async function pickSynthesizer(): Promise<{ name: string; synthesizer: ReadingSynthesizer }> {
  if (process.env.RUN_REAL_EVALS === "1" && process.env.OPENAI_API_KEY) {
    const { OpenAIReadingSynthesizer } = await import("@/lib/openai/synthesizer");
    return {
      name: `openai:${process.env.OPENAI_MODEL ?? "gpt-5.6-luna"}`,
      synthesizer: new OpenAIReadingSynthesizer({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
        reasoningEffort: "low",
        store: false,
      }),
    };
  }
  return { name: "fake (deterministic)", synthesizer: new FakeReadingSynthesizer("ok") };
}

function jaccardWords(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const intersection = [...wa].filter((w) => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 1 : intersection / union;
}

async function main(): Promise<void> {
  const { name, synthesizer } = await pickSynthesizer();
  const fixtures = buildEvalFixtures();
  console.log(`Running ${fixtures.length} fixtures against ${name}\n`);

  const records: EvalRecord[] = [];
  const maxTokens = { focused: 1400, deep: 2200, comprehensive: 3000 } as const;

  for (const fixture of fixtures) {
    resetCompilerForTests();
    const context = compileReadingContext(fixture.inputs);
    try {
      const result = await synthesizer.synthesize(context, {
        maxOutputTokens: maxTokens[context.reading.depth],
      });
      const validation = validateSynthesis(result.synthesis, context);
      const text = result.synthesis.paragraphs.map((p) => p.text).join("\n");
      records.push({
        id: fixture.id,
        ok: validation.ok,
        fatal: validation.problems.filter((p) => p.severity === "fatal").map((p) => `${p.code}:${p.detail}`),
        repairable: validation.problems
          .filter((p) => p.severity === "repairable")
          .map((p) => `${p.code}:${p.detail}`),
        words: text.split(/\s+/).filter(Boolean).length,
        text,
      });
    } catch (error) {
      records.push({
        id: fixture.id,
        ok: false,
        fatal: [`PROVIDER_ERROR:${String((error as Error).message).slice(0, 80)}`],
        repairable: [],
        words: 0,
        text: "",
      });
    }
  }

  // Suite-level: specificity / swap test — different draws must give
  // materially different prose for the same selections (spec §17.2).
  const swapPairs: Array<[string, string]> = [
    ["virgo_convergence__career_deep__none", "reversal_heavy__career_deep__none"],
    ["fire_surge__love_hidden__none", "water_depths__love_hidden__none"],
  ];
  const swapFailures: string[] = [];
  for (const [a, b] of swapPairs) {
    const ra = records.find((r) => r.id === a);
    const rb = records.find((r) => r.id === b);
    if (ra && rb && ra.text && rb.text) {
      const similarity = jaccardWords(ra.text, rb.text);
      if (similarity > 0.82) {
        swapFailures.push(`${a} vs ${b}: similarity ${similarity.toFixed(2)}`);
      }
    }
  }

  const failed = records.filter((r) => !r.ok);
  const fatalFailed = records.filter((r) => r.fatal.length > 0);

  console.log("┌─ Results ─────────────────────────────────────────");
  console.log(`│ fixtures:            ${records.length}`);
  console.log(`│ fully valid:         ${records.length - failed.length}`);
  console.log(`│ with fatal problems: ${fatalFailed.length}`);
  console.log(`│ swap-test failures:  ${swapFailures.length}`);
  console.log("└───────────────────────────────────────────────────");

  for (const record of fatalFailed.slice(0, 20)) {
    console.log(`  FATAL ${record.id}: ${record.fatal.join("; ")}`);
  }
  for (const record of failed.filter((r) => r.fatal.length === 0).slice(0, 10)) {
    console.log(`  repairable ${record.id}: ${record.repairable.join("; ")}`);
  }
  for (const failure of swapFailures) {
    console.log(`  SWAP ${failure}`);
  }

  // Gate: no fatal problems anywhere; ≥95% fully valid; swap test passes.
  const validRatio = (records.length - failed.length) / records.length;
  if (fatalFailed.length > 0 || validRatio < 0.95 || swapFailures.length > 0) {
    console.error(
      `\nEVAL GATE FAILED (valid ${(validRatio * 100).toFixed(1)}%, fatal ${fatalFailed.length}, swap ${swapFailures.length})`,
    );
    process.exit(1);
  }
  console.log(`\nEVAL GATE PASSED (valid ${(validRatio * 100).toFixed(1)}%)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
