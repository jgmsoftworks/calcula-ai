import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { isYouTubeVideoId } from '@/lib/youtube';

type Props = { storagePath: string | null; youtubeVideoId?: string | null; title: string };

export function TutorialPlayer({ storagePath, youtubeVideoId, title }: Props) {
  if (youtubeVideoId && isYouTubeVideoId(youtubeVideoId)) {
    return (
      <div>
        <div className="relative aspect-video min-h-[200px] w-full bg-black">
          <iframe
            key={youtubeVideoId}
            src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?playsinline=1&rel=0`}
            title={title}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3 text-xs">
          <span className="text-muted-foreground">Qualidade e tela cheia nos controles do vídeo.</span>
          <a href={`https://www.youtube.com/watch?v=${youtubeVideoId}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            Abrir no YouTube <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }
  if (storagePath && !youtubeVideoId) return <StoredTutorialPlayer key={storagePath} storagePath={storagePath} title={title} />;
  return <div role="alert" className="flex aspect-video items-center justify-center bg-muted p-6 text-center text-sm">Vídeo indisponível. Entre em contato com o suporte.</div>;
}

function StoredTutorialPlayer({ storagePath, title }: { storagePath: string; title: string }) {
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ path: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setFailed(false);
    async function prepareVideo() {
      try {
        const { data, error } = await supabase.storage
          .from('tutorial-videos')
          .createSignedUrl(storagePath, 60 * 60);
        if (cancelled) return;
        if (error || !data?.signedUrl) throw error || new Error('Vídeo indisponível');
        setSource({ path: storagePath, url: data.signedUrl });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void prepareVideo();
    return () => { cancelled = true; };
  }, [storagePath, attempt]);

  return (
    <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-black text-white">
      {failed ? (
        <div role="alert" className="space-y-3 p-4 text-center text-sm">
          <p>Não foi possível reproduzir esta aula. Confira sua conexão e tente novamente.</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </div>
      ) : source?.path === storagePath ? (
        <video
          key={source.url}
          src={source.url}
          aria-label={title}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <div role="status" className="flex items-center gap-2 text-sm text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" /> Preparando aula…
        </div>
      )}
    </div>
  );
}
