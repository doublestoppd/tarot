import { describe, expect, it } from "vitest";
import {
  buildSanitizedArtifact,
  decryptShareArtifact,
  encryptShareArtifact,
  ShareDecryptError,
} from "@/lib/client/share-crypto";
import type { ReadingDisplay } from "@/lib/reading/display";
import type { ReadingSynthesis } from "@/domain/reading-compiler/types";

/**
 * Web Crypto share round trip (spec §31.1): encrypt/decrypt, wrong-key
 * failure, and structural sanitization of the artifact. Runs on Node's
 * WebCrypto — the same API the browser uses.
 */

const display = {
  readingMoment: "2026-08-27T00:00:00.000Z",
  domainLabel: "Career & Purpose",
  focusLabel: "A new direction",
  insightLabel: "What may not be obvious",
  timePerspectiveLabel: "Developing over time",
  depth: "deep",
  spread: { id: "career_path", name: "Career Path", positions: [] },
  cards: [
    {
      cardId: "major_09_hermit",
      name: "The Hermit",
      orientation: "upright" as const,
      positionLabel: "Current professional pattern",
      positionPurpose: "The present shape of work.",
      meaning: "Deliberate withdrawal in order to see clearly.",
    },
  ],
  basisSummary: { included: [], notIncluded: [] },
  whatShaped: {
    cards: [],
    personal: ["Your natal Jupiter in Virgo matches…"],
    currentSky: [],
    availableNotEmphasized: [],
    notAvailable: [],
  },
  detailedBasis: [],
  deterministicFallback: {} as ReadingSynthesis,
} as unknown as ReadingDisplay;

const synthesis: ReadingSynthesis = {
  title: "Between Structure and Movement",
  paragraphs: [
    { text: "The reading's first paragraph.", evidenceIds: ["ev_card_1"] },
    { text: "And its second.", evidenceIds: ["ev_card_1"] },
  ],
  usedEvidenceIds: ["ev_card_1"],
  qualityFlags: {
    containsDirectPrediction: false,
    containsUnsupportedBiography: false,
  },
};

describe("buildSanitizedArtifact (spec §20.3)", () => {
  it("carries only the permitted fields and no evidence/personal data", () => {
    const artifact = buildSanitizedArtifact(display, synthesis);
    const json = JSON.stringify(artifact);
    expect(artifact.cards[0]!.displayName).toBe("The Hermit");
    expect(artifact.paragraphs.length).toBe(2);
    expect(json).not.toContain("evidenceId");
    expect(json).not.toContain("natal");
    expect(json).not.toContain("whatShaped");
    expect(json).not.toContain("Jupiter");
    expect(Object.keys(artifact).sort()).toEqual([
      "broadDomainLabel",
      "cards",
      "createdAt",
      "focusLabel",
      "paragraphs",
      "presentationVersion",
      "schemaVersion",
      "title",
    ]);
  });
});

describe("encrypt/decrypt round trip (spec §20.2)", () => {
  it("round-trips through AES-256-GCM with the fragment key", async () => {
    const artifact = buildSanitizedArtifact(display, synthesis);
    const encrypted = await encryptShareArtifact(artifact);
    expect(encrypted.fragmentKey.length).toBeGreaterThanOrEqual(43); // 256-bit b64url
    const decrypted = await decryptShareArtifact(
      encrypted.ciphertextB64,
      encrypted.ivB64,
      encrypted.fragmentKey,
    );
    expect(decrypted).toEqual(artifact);
  });

  it("fails closed with a wrong fragment key", async () => {
    const artifact = buildSanitizedArtifact(display, synthesis);
    const encrypted = await encryptShareArtifact(artifact);
    const other = await encryptShareArtifact(artifact);
    await expect(
      decryptShareArtifact(encrypted.ciphertextB64, encrypted.ivB64, other.fragmentKey),
    ).rejects.toThrow(ShareDecryptError);
  });

  it("fails closed on tampered ciphertext", async () => {
    const artifact = buildSanitizedArtifact(display, synthesis);
    const encrypted = await encryptShareArtifact(artifact);
    const tampered = Buffer.from(encrypted.ciphertextB64, "base64");
    tampered[0] = tampered[0]! ^ 0xff;
    await expect(
      decryptShareArtifact(
        tampered.toString("base64"),
        encrypted.ivB64,
        encrypted.fragmentKey,
      ),
    ).rejects.toThrow(ShareDecryptError);
  });
});
