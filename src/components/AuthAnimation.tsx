import { useEffect, useRef } from 'react';
import VIDEO from '@/assets/auth-mascot-sequence.mp4';
import POSTER from '@/assets/auth-mascot-sequence-poster.webp';

type ConnectionInfo = EventTarget & { saveData?: boolean; effectiveType?: string };

// The native video compositor avoids copying every frame through JavaScript.
// The existing file contains all three clips and the crossfade at the loop boundary.
export function AuthAnimation() {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const video = videoRef.current;
    if (!host || !video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: ConnectionInfo }).connection;
    const shouldUsePoster = () => motion.matches || connection?.saveData ||
      connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
    let visible = false;
    let disposed = false;
    let ready = false;
    const update = () => {
      if (disposed) return;
      const active = ready && visible && !document.hidden && !shouldUsePoster();
      if (!active) {
        video.pause();
        if (shouldUsePoster()) video.style.opacity = '0';
        return;
      }
      if (!video.getAttribute('src')) video.src = VIDEO;
      void video.play().catch(() => { /* Keep the poster when autoplay is unavailable. */ });
    };
    const showVideo = () => {
      if (disposed || shouldUsePoster() || !visible || document.hidden) {
        video.pause();
        return;
      }
      video.style.opacity = '1';
    };
    // Finish the initial document resources before decorative video competes for
    // bandwidth. Visibility and device preferences still gate the request.
    const start = () => { if (!disposed) { ready = true; update(); } };
    let idle: number | undefined;
    let timer: number | undefined;
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(start, { timeout: 2000 });
      } else {
        timer = window.setTimeout(start, 500);
      }
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
      update();
    }, { threshold: 0.2 });
    observer.observe(host);
    video.addEventListener('playing', showVideo);
    motion.addEventListener('change', update);
    connection?.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      disposed = true;
      window.removeEventListener('load', schedule);
      if (timer !== undefined) window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      observer.disconnect();
      video.removeEventListener('playing', showVideo);
      motion.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  return (
    <div ref={hostRef} className="relative aspect-square w-full overflow-hidden lg:aspect-[180/278]" aria-hidden="true">
      <img src={POSTER} alt="" width={720} height={1112} loading="lazy" decoding="async" {...{ fetchpriority: 'low' }} draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[center_35%]" />
      <video ref={videoRef} muted loop playsInline width={720} height={1112}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-0"
        preload="none" controls={false} disablePictureInPicture disableRemotePlayback tabIndex={-1} />
    </div>
  );
}
