-- A lesson uses either a private uploaded file or a YouTube video.
alter table public.tutorial_videos
  add column youtube_video_id text,
  alter column storage_path drop not null;

alter table public.tutorial_videos
  add constraint tutorial_videos_source_check check (
    (storage_path is not null and length(btrim(storage_path)) > 0 and youtube_video_id is null)
    or
    (storage_path is null and youtube_video_id is not null and youtube_video_id ~ '^[a-zA-Z0-9_-]{11}$')
  );

comment on column public.tutorial_videos.youtube_video_id is
  'YouTube video ID only. Mutually exclusive with storage_path. Existing publication and admin RLS policies apply.';
