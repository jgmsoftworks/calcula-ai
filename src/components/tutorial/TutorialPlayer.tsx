import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Props = { storagePath: string; title: string };

export function TutorialPlayer({ storagePath, title }: Props) {
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
