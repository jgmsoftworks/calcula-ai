const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const EMBED_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function isYouTubeVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/** Accept video links, never arbitrary iframe HTML or third-party embed URLs. */
export function parseYouTubeVideoId(value: string): string | null {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;
    if (url.hostname === 'youtu.be' && parts.length === 1) {
      id = parts[0];
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1];
    } else if (EMBED_HOSTS.has(url.hostname) && parts.length === 2 && parts[0] === 'embed') {
      id = parts[1];
    }
    return id && isYouTubeVideoId(id) ? id : null;
  } catch {
    return null;
  }
}
