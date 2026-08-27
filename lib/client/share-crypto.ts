import type { ReadingDisplay } from "@/lib/reading/display";
import type { ReadingSynthesis } from "@/domain/reading-compiler/types";

/**
 * Client-side share encryption (spec §20.2): AES-256-GCM via Web Crypto.
 * The key is generated in the browser, placed in the URL fragment, and never
 * sent to the server. This module also runs under Node's WebCrypto for
 * round-trip tests.
 */

export interface SanitizedShareArtifact {
  schemaVersion: 1;
  createdAt: string;
  broadDomainLabel: string;
  focusLabel?: string;
  title: string;
  cards: Array<{
    cardId: string;
    displayName: string;
    orientation: "upright" | "reversed";
    positionLabel: string;
  }>;
  paragraphs: string[];
  presentationVersion: string;
}

/**
 * Build the minimized artifact (spec §20.3). EXCLUDES birth data, natal and
 * numerology objects, current sky, resonance scores, evidence ids, prompt,
 * model metadata, and credentials — structurally, by never reading them.
 */
export function buildSanitizedArtifact(
  display: ReadingDisplay,
  synthesis: ReadingSynthesis,
): SanitizedShareArtifact {
  return {
    schemaVersion: 1,
    createdAt: display.readingMoment,
    broadDomainLabel: display.domainLabel,
    focusLabel: display.focusLabel,
    title: synthesis.title,
    cards: display.cards.map((c) => ({
      cardId: c.cardId,
      displayName: c.name,
      orientation: c.orientation,
      positionLabel: c.positionLabel,
    })),
    paragraphs: synthesis.paragraphs.map((p) => p.text),
    presentationVersion: "celestial_prototype-1.0",
  };
}

function b64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64decode(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64urlFromB64(text: string): string {
  return text.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64FromB64url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return padded + "=".repeat((4 - (padded.length % 4)) % 4);
}

export interface EncryptedShare {
  ciphertextB64: string;
  ivB64: string;
  /** base64url key for the URL fragment — never transmitted to the server. */
  fragmentKey: string;
}

export async function encryptShareArtifact(
  artifact: SanitizedShareArtifact,
): Promise<EncryptedShare> {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(artifact));
  const ciphertext = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  const rawKey = new Uint8Array(await subtle.exportKey("raw", key));
  return {
    ciphertextB64: b64(ciphertext),
    ivB64: b64(iv),
    fragmentKey: b64urlFromB64(b64(rawKey)),
  };
}

export class ShareDecryptError extends Error {
  constructor() {
    super("share decryption failed");
    this.name = "ShareDecryptError";
  }
}

export async function decryptShareArtifact(
  ciphertextB64: string,
  ivB64: string,
  fragmentKey: string,
): Promise<SanitizedShareArtifact> {
  const subtle = globalThis.crypto.subtle;
  let artifact: SanitizedShareArtifact;
  try {
    const key = await subtle.importKey(
      "raw",
      b64decode(b64FromB64url(fragmentKey)),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(ivB64) },
      key,
      b64decode(ciphertextB64),
    );
    artifact = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new ShareDecryptError();
  }
  if (
    artifact.schemaVersion !== 1 ||
    !Array.isArray(artifact.cards) ||
    !Array.isArray(artifact.paragraphs) ||
    typeof artifact.title !== "string"
  ) {
    throw new ShareDecryptError();
  }
  return artifact;
}
