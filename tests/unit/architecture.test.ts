import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { drawCards } from "@/domain/tarot/draw";

/**
 * Layering rule (spec §26.1): domain engines must not import Next.js, the
 * OpenAI SDK, database clients, UI code, or platform lib/ modules. The draw
 * function must not accept reading context (spec §9.2, ADR 0003).
 */

const ROOT = path.resolve(__dirname, "../..");

function tsFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...tsFilesUnder(full));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const FORBIDDEN_DOMAIN_IMPORTS = [
  /from\s+["']next[/"']/,
  /from\s+["']react["']/,
  /from\s+["']openai["']/,
  /from\s+["']pg["']/,
  /from\s+["']drizzle-orm/,
  /from\s+["']@\/lib\//,
  /from\s+["']@\/app\//,
  /from\s+["']@\/components\//,
];

describe("architecture layering", () => {
  it("domain/ has no framework, SDK, database, or lib imports", () => {
    for (const file of tsFilesUnder(path.join(ROOT, "domain"))) {
      const source = readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_DOMAIN_IMPORTS) {
        expect(pattern.test(source), `${file} matches ${pattern}`).toBe(false);
      }
    }
  });

  it("data/ has no framework, SDK, database, or lib imports", () => {
    for (const file of tsFilesUnder(path.join(ROOT, "data"))) {
      const source = readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_DOMAIN_IMPORTS) {
        expect(pattern.test(source), `${file} matches ${pattern}`).toBe(false);
      }
    }
  });
});

describe("independent draw contract", () => {
  it("drawCards accepts only cardCount and reversalsEnabled (plus test RNG)", () => {
    // Function.length counts parameters before the first default value.
    expect(drawCards.length).toBe(2);
  });

  it("the draw module contains no reading-context vocabulary", () => {
    const source = readFileSync(
      path.join(ROOT, "domain/tarot/draw.ts"),
      "utf-8",
    );
    // Strip comments: the contract text itself names the forbidden inputs.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const word of [
      "birth",
      "domainId",
      "focus",
      "insight",
      "natal",
      "astrolog",
      "numerolog",
      "resonance",
      "synthesis",
      "profile",
    ]) {
      expect(code.toLowerCase()).not.toContain(word);
    }
  });
});
