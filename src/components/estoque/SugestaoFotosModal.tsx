import { useEffect, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SugestaoFotosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  barcode?: string;
  onSelect: (file: File, previewUrl: string) => void;
}

export function SugestaoFotosModal({
  open,
  onOpenChange,
  productName,
  barcode,
  onSelect,
}: SugestaoFotosModalProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchImages = async () => {
      setLoading(true);
      setImages([]);
      try {
        const { data, error } = await supabase.functions.invoke('generate-image-suggestions', {
          body: { productName, barcode },
        });
        if (error) throw error;
        setImages(Array.isArray(data?.images) ? data.images : []);
      } catch (err) {
        console.error('Erro ao buscar sugestões:', err);
        toast.error('Não foi possível buscar sugestões');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [open, productName, barcode]);

  const handleSelect = async (url: string, idx: number) => {
    try {
      setDownloadingIdx(idx);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Falha ao baixar imagem');
      const blob = await resp.blob();
      const file = new File([blob], `sugestao-${Date.now()}.jpg`, {
        type: blob.type || 'image/jpeg',
      });
      const previewUrl = URL.createObjectURL(blob);
      onSelect(file, previewUrl);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível usar essa imagem');
    } finally {
      setDownloadingIdx(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sugestões de fotos</DialogTitle>
          <DialogDescription>
            {barcode
              ? `Buscando pelo código de barras ${barcode}`
              : productName
                ? `Buscando por "${productName}"`
                : 'Sem critério de busca'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Buscando imagens...
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ImageOff className="h-10 w-10 mb-2" />
            <p className="text-sm">Nenhuma imagem encontrada.</p>
            <p className="text-xs">Tente fazer upload manual.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(url, idx)}
                disabled={downloadingIdx !== null}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all bg-muted/30',
                  downloadingIdx === idx && 'opacity-50',
                  downloadingIdx !== null && downloadingIdx !== idx && 'opacity-30 pointer-events-none'
                )}
              >
                <img
                  src={url}
                  alt={`Sugestão ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {downloadingIdx === idx && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
