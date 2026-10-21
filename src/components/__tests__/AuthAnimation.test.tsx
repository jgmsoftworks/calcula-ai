import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AuthAnimation } from '../AuthAnimation';

let visibility: (entries: Partial<IntersectionObserverEntry>[]) => void;
let idle: () => void;
let motion: EventTarget & { matches: boolean };
let connection: EventTarget & { saveData: boolean; effectiveType: string };
let disconnect: ReturnType<typeof vi.fn>;
let cancelIdle: ReturnType<typeof vi.fn>;

const intersect = (ratio: number) => visibility([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
const openAnimation = () => {
  const view = render(<AuthAnimation />);
  return { ...view, video: view.container.querySelector('video')! };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  motion = Object.assign(new EventTarget(), { matches: false });
  connection = Object.assign(new EventTarget(), { saveData: false, effectiveType: '4g' });
  vi.spyOn(window, 'matchMedia').mockReturnValue(motion as MediaQueryList);
  Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  disconnect = vi.fn();
  cancelIdle = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof visibility) { visibility = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal('requestIdleCallback', vi.fn((callback: () => void) => { idle = callback; return 7; }));
  vi.stubGlobal('cancelIdleCallback', cancelIdle);
});

afterEach(() => {
  cleanup();
  delete (navigator as Navigator & { connection?: unknown }).connection;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('authentication animation loading', () => {
  it('waits for the initial document and an idle slot before requesting a visible video', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const { video } = openAnimation();
    intersect(1);
    expect(video).not.toHaveAttribute('src');
    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    fireEvent.load(window);
    expect(video).not.toHaveAttribute('src');
    idle();
    expect(video).toHaveAttribute('src', expect.stringContaining('auth-mascot-sequence.mp4'));
    expect(video.play).toHaveBeenCalledOnce();
    expect(video.style.opacity).not.toBe('1');
    fireEvent.playing(video);
    expect(video.style.opacity).toBe('1');
  });

  it('does not request an offscreen video and starts it when the user scrolls to it', () => {
    const { video } = openAnimation();
    idle();
    intersect(0.1);
    expect(video).not.toHaveAttribute('src');
    intersect(0.5);
    expect(video).toHaveAttribute('src');
    expect(video.play).toHaveBeenCalledOnce();
    vi.mocked(video.pause).mockClear();
    intersect(0);
    expect(video.pause).toHaveBeenCalledOnce();
  });

  it.each(['reduced motion', 'data saver', '2g', 'slow-2g'])('uses only the poster for %s', (preference) => {
    if (preference === 'reduced motion') motion.matches = true;
    else if (preference === 'data saver') connection.saveData = true;
    else connection.effectiveType = preference;
    const { video } = openAnimation();
    idle();
    intersect(1);
    expect(video).not.toHaveAttribute('src');
    expect(video.play).not.toHaveBeenCalled();
    expect(video.style.opacity).toBe('0');
  });

  it('responds to preference changes without losing the poster fallback', () => {
    connection.saveData = true;
    const { video } = openAnimation();
    idle();
    intersect(1);
    connection.saveData = false;
    connection.dispatchEvent(new Event('change'));
    expect(video.play).toHaveBeenCalledOnce();
    fireEvent.playing(video);
    motion.matches = true;
    motion.dispatchEvent(new Event('change'));
    expect(video.style.opacity).toBe('0');
    fireEvent.playing(video);
    expect(video.style.opacity).toBe('0');
  });

  it('waits while the tab is hidden and pauses when the user leaves it', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    const { video } = openAnimation();
    idle();
    intersect(1);
    expect(video).not.toHaveAttribute('src');
    hidden.mockReturnValue(false);
    fireEvent(document, new Event('visibilitychange'));
    expect(video.play).toHaveBeenCalledOnce();
    vi.mocked(video.pause).mockClear();
    hidden.mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(video.pause).toHaveBeenCalledOnce();
  });

  it('keeps the poster when the browser blocks autoplay', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('Autoplay blocked'));
    const { video } = openAnimation();
    idle();
    intersect(1);
    await Promise.resolve();
    expect(video.style.opacity).not.toBe('1');
  });

  it('supports browsers without requestIdleCallback', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const { video } = openAnimation();
    intersect(1);
    expect(video).not.toHaveAttribute('src');
    vi.advanceTimersByTime(500);
    expect(video.play).toHaveBeenCalledOnce();
  });

  it('cancels pending work when the login screen is closed', () => {
    const { video, unmount } = openAnimation();
    intersect(1);
    unmount();
    expect(cancelIdle).toHaveBeenCalledWith(7);
    expect(disconnect).toHaveBeenCalledOnce();
    idle();
    intersect(1);
    expect(video).not.toHaveAttribute('src');
    expect(video.play).not.toHaveBeenCalled();
    expect(video.load).toHaveBeenCalledOnce();
  });

  it('removes the load listener when navigating away before the document finishes', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const { unmount } = openAnimation();
    unmount();
    fireEvent.load(window);
    expect(window.requestIdleCallback).not.toHaveBeenCalled();
  });
});
