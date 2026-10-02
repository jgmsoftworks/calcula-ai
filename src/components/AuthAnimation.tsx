import { useEffect, useRef } from 'react';

const VIDEO = '/videos/auth-mascot-sequence.mp4';
const POSTER = '/images/auth-mascot-sequence-poster.webp';

// Both clips are precomposed with 0.5s crossfades, including the loop boundary.
// Vertical cropping preserves the full width and removes the original black bars.
// Canvas keeps this decorative loop free of native player controls.
export function AuthAnimation() {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!host || !video || !canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let active = false;
    let frame = 0;
    let last = 0;

    const draw = (time: number) => {
      if (!active) return;
      if (video.readyState >= 2 && time - last >= 40) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.style.opacity = '1';
        last = time;
      }
      frame = requestAnimationFrame(draw);
    };
    const update = () => {
      active = visible && !document.hidden && !motion.matches;
      cancelAnimationFrame(frame);
      if (!active) {
        video.pause();
        if (motion.matches) canvas.style.opacity = '0';
        return;
      }
      if (!video.getAttribute('src')) video.src = VIDEO;
      void video.play().catch(() => { /* The poster remains if autoplay is blocked. */ });
      frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(host);
    motion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
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
      <canvas ref={canvasRef} width={720} height={1112}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_35%] opacity-0" />
      <video ref={videoRef} hidden style={{ display: 'none' }} muted loop playsInline
        preload="none" controls={false} disablePictureInPicture disableRemotePlayback tabIndex={-1} />
    </div>
  );
}
