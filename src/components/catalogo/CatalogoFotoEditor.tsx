import { useEffect, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageCropperModal } from '@/components/ui/image-cropper-modal';
import { validateImageFile } from '@/lib/uploadValidation';
export interface CatalogoFotoInput { nome: string; imagem_url?: string | null }
interface EditorLabels { name: string; photo: string; preview: string; save: string; action: string; placeholder: string }

export function CatalogoFotoEditor({ item, labels, saving, onSave, onCancel }: {
  item?: CatalogoFotoInput;
  labels: EditorLabels;
  saving: boolean;
  onSave: (input: CatalogoFotoInput) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState(item?.nome || '');
  const [imagem, setImagem] = useState(item?.imagem_url || null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => { if (cropSource) URL.revokeObjectURL(cropSource); }, [cropSource]);
  return <form onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (!saving && nome.trim()) onSave({ nome, imagem_url: imagem }); }} className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4 sm:p-5">
    <div className="flex items-start gap-4">
      <div className="shrink-0 space-y-2">
        <label className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-background ${saving ? 'opacity-60' : 'cursor-pointer hover:bg-primary/5'}`}>
          {imagem ? <img src={imagem} alt={labels.preview} className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-primary" />}
          <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1 bg-background/95 py-1 text-[10px] font-semibold text-primary"><Camera className="h-3 w-3" />{imagem ? 'Trocar foto' : 'Adicionar foto'}</span>
          <input type="file" aria-label={labels.photo} accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={saving} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            const validation = validateImageFile(file);
            if (!validation.ok) { setError(validation.error || 'Imagem inválida.'); return; }
            setError(''); setCropSource(URL.createObjectURL(file));
          }} />
        </label>
        {imagem && <button type="button" disabled={saving} onClick={() => setImagem(null)} className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive"><X className="h-3 w-3" />Remover foto</button>}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="catalogo-nome">{labels.name}</Label>
        <Input id="catalogo-nome" autoFocus value={nome} disabled={saving} onChange={event => setNome(event.target.value)} placeholder={labels.placeholder} maxLength={120} />
        <p className="text-xs leading-relaxed text-muted-foreground">JPG, PNG ou WebP. Até 5 MB.</p>
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <div className="mt-4 flex justify-end gap-2 border-t border-primary/10 pt-4">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
      <Button type="submit" disabled={saving || !nome.trim()} aria-label={labels.save}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{labels.action}
      </Button>
    </div>
    {cropSource && <ImageCropperModal open imageSrc={cropSource} onClose={() => setCropSource(null)} onCropComplete={setImagem} />}
  </form>;
}
