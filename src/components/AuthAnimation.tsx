import { useEffect, useRef } from 'react';

const VIDEO = '/videos/auth-mascot-sequence-v3.mp4';
const POSTER = '/images/auth-mascot-sequence-poster.webp';

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
    let visible = false;
    let disposed = false;
    let ready = false;
    const update = () => {
      const active = ready && visible && !document.hidden && !motion.matches;
      if (!active) {
        video.pause();
        if (motion.matches) video.style.opacity = '0';
        return;
      }
      if (!video.getAttribute('src')) video.src = VIDEO;
      void video.play().catch(() => { /* Keep the poster when autoplay is unavailable. */ });
    };
    const showVideo = () => {
      if (disposed || motion.matches || !visible || document.hidden) {
        video.pause();
        return;
      }
      video.style.opacity = '1';
    };
    // Give the form and poster a chance to render before starting the media request.
    const start = () => { ready = true; update(); };
    const timer = window.setTimeout(start, 350);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(host);
    video.addEventListener('playing', showVideo);
    motion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      video.removeEventListener('playing', showVideo);
      motion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, []);

  return (
    <div ref={hostRef} className="relative aspect-square w-full overflow-hidden lg:aspect-[180/278]" aria-hidden="true">
      <img src={POSTER} alt="" width={720} height={1112} fetchPriority="high" draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[center_35%]" />
      <video ref={videoRef} muted loop playsInline width={720} height={1112}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-0"
        preload="none" controls={false} disablePictureInPicture disableRemotePlayback tabIndex={-1} />
    </div>
  );
}
