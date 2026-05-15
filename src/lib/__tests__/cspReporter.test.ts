import { describe, it, expect, vi, beforeEach } from "vitest";
import { initCspReporter } from "../cspReporter";

describe("cspReporter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("envia relatório quando o navegador dispara securitypolicyviolation", () => {
    const beacon = vi.fn().mockReturnValue(true);
    vi.spyOn(navigator, "sendBeacon").mockImplementation(beacon as any);

    initCspReporter();

    const evt = new Event("securitypolicyviolation") as any;
    evt.documentURI = "https://app.example/";
    evt.violatedDirective = "script-src";
    evt.effectiveDirective = "script-src";
    evt.blockedURI = "https://evil.example/x.js";
    window.dispatchEvent(evt);

    expect(beacon).toHaveBeenCalledTimes(1);
    const [, body] = beacon.mock.calls[0];
    expect(body).toBeInstanceOf(Blob);
  });
});
