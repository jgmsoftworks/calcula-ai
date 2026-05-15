import { describe, it, expect } from "vitest";
import { CONSENT_VERSION } from "../consent";

describe("consent", () => {
  it("exporta versão de consentimento estável (string semver)", () => {
    expect(typeof CONSENT_VERSION).toBe("string");
    expect(CONSENT_VERSION.length).toBeGreaterThan(0);
  });
});
