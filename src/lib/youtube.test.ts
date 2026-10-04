import { describe, expect, it } from 'vitest';
import { parseYouTubeVideoId } from './youtube';

describe('YouTube video links', () => {
  it.each([
    'https://www.youtube.com/watch?v=M7lc1UVf-VE&list=anything&t=30',
    ' https://youtu.be/M7lc1UVf-VE?si=share ',
    'youtube.com/watch?v=M7lc1UVf-VE',
    'https://m.youtube.com/watch?v=M7lc1UVf-VE',
    'https://www.youtube.com/shorts/M7lc1UVf-VE',
    'https://www.youtube.com/live/M7lc1UVf-VE',
    'https://www.youtube.com/embed/M7lc1UVf-VE',
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE',
  ])('normalizes %s to a video ID starting at the beginning', (link) => {
    expect(parseYouTubeVideoId(link)).toBe('M7lc1UVf-VE');
  });

  it.each([
    '', 'M7lc1UVf-VE', 'javascript:alert(1)',
    '<iframe src="https://youtube.com/embed/M7lc1UVf-VE"></iframe>',
    'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
    'https://youtube.com@evil.example/watch?v=M7lc1UVf-VE',
    'https://evil.example@youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com/playlist?list=M7lc1UVf-VE',
    'https://youtu.be/short',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://www.youtube.com/watch?v=M7lc1UVf-VE%22%3E',
  ])('rejects unsupported or unsafe input %s', (link) => {
    expect(parseYouTubeVideoId(link)).toBeNull();
  });
});
