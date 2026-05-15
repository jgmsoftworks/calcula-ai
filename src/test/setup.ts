import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Stub para sendBeacon (não existe em jsdom)
if (!("sendBeacon" in navigator)) {
  Object.defineProperty(navigator, "sendBeacon", {
    writable: true,
    value: () => true,
  });
}
