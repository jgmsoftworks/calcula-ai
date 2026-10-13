import { useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { emptyNutritionLabel, MAX_NUTRITION_LABELS, nutritionKey, type NutritionLabel } from '@/lib/nutritionLabel';
import { validateNutritionPhoto } from '@/lib/nutritionStorage';
import { RotuloNutricionalTab } from './RotuloNutricionalTab';

interface Props {
  value: NutritionLabel[];
  onChange: (value: NutritionLabel[]) => void;
  marcas: string[];
  photos: Record<string, File>;
  onPhotoChange: (id: string, file: File) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  disabled?: boolean;
  onManageBrands: () => void;
}

export function RotulosNutricionaisTab({ value, onChange, marcas, photos, onPhotoChange, busy, onBusyChange, disabled, onManageBrands }: Props) {
  const [activeId, setActiveId] = useState(value[0]?.id);
  const [choosing, setChoosing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [importRequest, setImportRequest] = useState<{ id: string; file: File } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const brands = [...new Map(marcas.filter(name => name.trim()).map(name => [nutritionKey(name), name.trim()])).values()];
  const index = Math.max(0, value.findIndex(label => label.id === activeId));
  const current = value[index];
  const locked = disabled || busy;

  function selectBrand(brand: string, file: File | null = pendingPhoto) {
    const existing = value.find(label => nutritionKey(label.marca) === nutritionKey(brand));
    if (assigning && current && existing && existing.id !== current.id) {
      toast.error('Essa marca já tem um rótulo. Selecione outra marca para este cadastro.');
      return;
    }
    const label = assigning && current ? { ...current, marca: brand, conferido: false } : existing ?? emptyNutritionLabel(brand);
    if (assigning) onChange(value.map(item => item.id === label.id ? label : item));
    else if (!existing) {
      if (value.length >= MAX_NUTRITION_LABELS) { toast.error('Limite de rótulos por produto atingido.'); return; }
      onChange([...value, label]);
    }
    setActiveId(label.id);
    setChoosing(false);
    setAssigning(false);
    setPendingPhoto(null);
    if (file) setImportRequest({ id: label.id, file });
  }
  function addLabel(file: File | null = null) {
    if (file) { const error = validateNutritionPhoto(file); if (error) { toast.error(error); return; } }
    setAssigning(false);
    if (brands.length === 1) selectBrand(brands[0], file);
    else { setPendingPhoto(file); setChoosing(true); }
  }

  return <div className="min-w-0 space-y-5">
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Importar primeira foto do rótulo"
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) addLabel(file); }} />
    {!current && !choosing && <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
      <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <h2 className="font-medium">Rótulo nutricional do produto</h2>
      <p className="mt-1 text-sm text-muted-foreground">Adicione as informações da embalagem da marca utilizada.</p>
    </div>}
    <div className="flex min-w-0 items-center gap-2">
      <Button type="button" variant={current ? 'outline' : 'default'} className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal py-2 sm:flex-none" disabled={locked || choosing || !brands.length} onClick={() => addLabel()}>
        <Plus className="mr-2 h-4 w-4 shrink-0" />{current ? 'Adicionar rótulo' : 'Adicionar rótulo nutricional'}
      </Button>
      {!current && <Button type="button" variant="outline" className="h-11 w-11 shrink-0" size="icon" aria-label="Importar rótulo por foto" disabled={locked || choosing || !brands.length} onClick={() => fileRef.current?.click()}><Camera className="h-5 w-5" /></Button>}
    </div>
    {!brands.length && <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
      Cadastre uma marca no produto para adicionar o rótulo.
      <Button type="button" variant="link" className="h-auto whitespace-normal p-0 ml-1" disabled={locked} onClick={onManageBrands}>Ir para Estoque & Custos</Button>
    </div>}
    {choosing && <section aria-label="Escolher marca do rótulo" className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <h3 className="font-medium">Para qual marca deseja {assigning ? 'vincular este rótulo' : 'cadastrar'}?</h3>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        {brands.map(brand => <Button key={brand} type="button" variant="outline" className="h-auto min-h-12 justify-between gap-2 whitespace-normal text-left" disabled={locked} onClick={() => selectBrand(brand)}>
          <span className="min-w-0 break-words">{brand}</span>{' '}
          {value.some(label => nutritionKey(label.marca) === nutritionKey(brand)) && <span className="shrink-0 text-xs text-muted-foreground">Já cadastrado</span>}
        </Button>)}
      </div>
      <Button type="button" variant="ghost" disabled={locked} onClick={() => { setChoosing(false); setAssigning(false); setPendingPhoto(null); }}>Cancelar escolha</Button>
    </section>}
    {current && <>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border bg-primary/5 p-3">
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Rótulo da marca anterior" disabled={locked || choosing || value.length < 2} onClick={() => setActiveId(value[(index - 1 + value.length) % value.length].id)}><ChevronLeft className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="text-xs text-muted-foreground">Rótulo da marca</p>
          <h2 className="break-words text-lg font-semibold">{current.marca || 'Marca não informada'}</h2>
          <p className="text-xs text-muted-foreground">{index + 1} de {value.length}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Rótulo da próxima marca" disabled={locked || choosing || value.length < 2} onClick={() => setActiveId(value[(index + 1) % value.length].id)}><ChevronRight className="h-5 w-5" /></Button>
      </div>
      {!current.marca && <Button type="button" variant="outline" disabled={locked || !brands.length} onClick={() => { setAssigning(true); setChoosing(true); }}>Vincular marca</Button>}
      <RotuloNutricionalTab key={current.id} value={current}
        onChange={label => { if (label) onChange(value.map(item => item.id === current.id ? label : item)); }}
        photo={photos[current.id] ?? null} onPhotoChange={file => { if (file) onPhotoChange(current.id, file); setImportRequest(null); }}
        onBusyChange={onBusyChange} disabled={disabled || choosing} importFile={importRequest?.id === current.id ? importRequest.file : null} />
    </>}
    <p className="text-xs text-muted-foreground">Cadastre um rótulo para cada marca. Copie as informações da embalagem correspondente; os valores e a foto ficam separados por marca.</p>
  </div>;
}
