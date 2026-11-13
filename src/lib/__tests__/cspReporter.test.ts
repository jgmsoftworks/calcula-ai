import { describe, it, expect, vi, beforeEach } from "vitest";
import { initCspReporter } from "../cspReporter";

describe("cspReporter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("envia relatório quando o navegador dispara securitypolicyviolation", () => {
    const beacon = vi.fn<typeof navigator.sendBeacon>().mockReturnValue(true);
    vi.spyOn(navigator, "sendBeacon").mockImplementation(beacon);

    initCspReporter();

    const evt = Object.assign(new Event("securitypolicyviolation"), {
      documentURI: "https://app.example/", violatedDirective: "script-src",
      effectiveDirective: "script-src", blockedURI: "https://evil.example/x.js",
    });
    window.dispatchEvent(evt);

    expect(beacon).toHaveBeenCalledTimes(1);
    const [, body] = beacon.mock.calls[0];
    expect(body).toBeInstanceOf(Blob);
  });
});
