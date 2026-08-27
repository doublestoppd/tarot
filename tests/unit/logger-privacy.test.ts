import { describe, expect, it } from "vitest";
import { scrubMeta, newRequestId } from "@/lib/logging/logger";

/**
 * Privacy logging guarantees (spec §18.3, §31.1): sensitive key classes can
 * never reach a log line even if passed by mistake; correlation ids are
 * opaque.
 */
describe("scrubMeta", () => {
  it("scrubs every sensitive key class", () => {
    const scrubbed = scrubMeta({
      accessCode: "SECRET-CODE",
      birthDate: "1992-05-17",
      cards: ["major_09_hermit"],
      prompt: "system prompt text",
      cookie: "pt_session=abc",
      authorization: "Bearer x",
      ticket: "pt1.v1.aaa",
      apiKey: "sk-123",
      password: "hunter2",
      requestBody: { birth: "1990-01-01" },
      placeQuery: "paris",
      prose: "the reading text",
    });
    for (const value of Object.values(scrubbed)) {
      expect(value).toBe("[scrubbed]");
    }
  });

  it("keeps operational keys and truncates long strings", () => {
    const scrubbed = scrubMeta({
      requestId: "abc123",
      route: "readings/prepare",
      status: 200,
      ms: 41,
      detail: "x".repeat(500),
    });
    expect(scrubbed.requestId).toBe("abc123");
    expect(scrubbed.status).toBe(200);
    expect(String(scrubbed.detail)).toContain("truncated");
  });

  it("scrubs nested objects recursively", () => {
    const scrubbed = scrubMeta({ context: { birthTime: "12:30", ms: 5 } });
    expect((scrubbed.context as Record<string, unknown>).birthTime).toBe("[scrubbed]");
  });
});

describe("newRequestId", () => {
  it("is opaque hex, unique per call", () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).not.toBe(b);
  });
});
