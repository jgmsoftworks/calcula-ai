import { describe, it, expect } from "vitest";
import { getTurnstileToken, TURNSTILE_ENABLED } from "../turnstile";

describe("turnstile (fail-open quando desligado)", () => {
  it("flag inicia desligada por padrão no preview", () => {
    expect(TURNSTILE_ENABLED).toBe(false);
  });

  it("getTurnstileToken retorna null quando desligado", async () => {
    const token = await getTurnstileToken("signup");
    expect(token).toBeNull();
  });
});
