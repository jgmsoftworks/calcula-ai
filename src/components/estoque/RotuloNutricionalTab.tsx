import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { emptyNutritionLabel, mergeNutritionImport, missingNutritionFields, NUTRIENTS, type NutritionLabel, type NutritionRow } from '@/lib/nutritionLabel';
import { nutritionPhotoUrl, validateNutritionPhoto } from '@/lib/nutritionStorage';

interface Props {
  value: NutritionLabel | null;
  onChange: (value: NutritionLabel | null) => void;
  photo: File | null;
  onPhotoChange: (file: File | null) => void;
  onBusyChange: (busy: boolean) => void;
  marcaSugerida?: string;
  disabled?: boolean;
}

// Unlike money inputs, an empty nutritional amount must remain null, never zero.
function AmountInput({ value, onChange, label, disabled }: { value: number | null; onChange: (value: number | null) => void; label: string; disabled?: boolean }) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  useEffect(() => setText(value === null ? '' : String(value).replace('.', ',')), [value]);
  return <Input aria-label={label} inputMode="decimal" placeholder="Não informado" value={text} disabled={disabled} className="h-11 min-w-0"
    onChange={event => {
      const next = event.target.value;
      if (!/^\d{0,7}([,.]\d{0,6})?$/.test(next)) return;
      const parsed = next === '' || next === ',' || next === '.' ? null : Number(next.replace(',', '.'));
      if (parsed !== null && parsed > 1_000_000) return;
      setText(next);
      onChange(parsed);
    }} />;
}

export function RotuloNutricionalTab({ value, onChange, photo, onPhotoChange, onBusyChange, marcaSugerida = '', disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const latestValue = useRef(value);
  latestValue.current = value;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [notice, setNotice] = useState('');
  const missing = value ? missingNutritionFields(value) : [];

  useEffect(() => () => { controllerRef.current?.abort(); onBusyChange(false); }, [onBusyChange]);
  useEffect(() => {
    let active = true;
    setPhotoError(false);
    if (photo) {
      const url = URL.createObjectURL(photo);
      setPreview(url);
      return () => { active = false; URL.revokeObjectURL(url); };
    }
    setPreview(null);
    if (value?.foto_path) {
      nutritionPhotoUrl(value.foto_path).then(url => { if (active) setPreview(url); })
        .catch(() => { if (active) setPhotoError(true); });
    }
    return () => { active = false; };
  }, [photo, value?.foto_path]);

  function update(changes: Partial<NutritionLabel>) {
    onChange({ ...(value ?? emptyNutritionLabel(marcaSugerida)), ...changes, conferido: false });
  }
  function updateRow(index: number, changes: Partial<NutritionRow>) {
    if (!value) return;
    update({ nutrientes: value.nutrientes.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row) });
  }
  function cancelImport() {
    controllerRef.current?.abort();
    setBusy(false);
    onBusyChange(false);
    setNotice('Leitura cancelada. Você pode preencher os campos consultando a foto.');
  }
  async function importPhoto(file: File) {
    const error = validateNutritionPhoto(file);
    if (error) { toast.error(error); return; }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    onPhotoChange(file);
    if (!value) onChange({ ...emptyNutritionLabel(marcaSugerida), origem: 'foto' });
    else update({ origem: 'foto' });
    setBusy(true);
    onBusyChange(true);
    setProgress(0);
    setNotice('');
    const timeout = window.setTimeout(() => {
      if (controllerRef.current !== controller) return;
      controller.abort();
      setBusy(false);
      onBusyChange(false);
      setNotice('A leitura demorou mais que o esperado. A foto continua disponível para preencher os campos.');
    }, 60_000);
    controller.signal.addEventListener('abort', () => window.clearTimeout(timeout), { once: true });
    try {
      const { recognizeNutritionPhoto } = await import('@/lib/nutritionOcr');
      controller.signal.throwIfAborted();
      const imported = await recognizeNutritionPhoto(file, controller.signal, amount => {
        if (!controller.signal.aborted) setProgress(amount);
      });
      if (controller.signal.aborted) return;
      const current = latestValue.current ?? emptyNutritionLabel(marcaSugerida);
      const merged = mergeNutritionImport(current, imported);
      onChange(merged.nutrientes.length ? merged : { ...merged, nutrientes: [{ nutriente: '', quantidade: null }] });
      setNotice(imported.nutrientes.length
        ? 'Confira os dados com a foto, inclusive a quantidade de referência. Campos já preenchidos foram preservados; valores duvidosos ficaram em branco.'
        : 'Não foi possível identificar a tabela. Preencha os campos consultando a foto ou tente outra imagem mais nítida.');
    } catch {
      if (!controller.signal.aborted) setNotice('Não foi possível ler a foto. Você pode preencher os campos ou tentar outra imagem.');
    } finally {
      window.clearTimeout(timeout);
      if (!controller.signal.aborted) { setBusy(false); onBusyChange(false); }
    }
  }

  const cameraButton = <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" disabled={disabled || busy}
    aria-label="Importar rótulo por foto" title="Importar rótulo por foto" onClick={() => inputRef.current?.click()}><Camera className="h-5 w-5" /></Button>;

  return <div className="space-y-5 min-w-0">
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Foto do rótulo nutricional"
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importPhoto(file); }} />
    {!value ? <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
      <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">Rótulo nutricional do produto</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Cadastre as informações da embalagem. Você pode adicionar as linhas aos poucos ou importar uma foto.</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button type="button" className="min-h-11 whitespace-normal" disabled={disabled} onClick={() => onChange(emptyNutritionLabel(marcaSugerida))}><Plus className="mr-2 h-4 w-4 shrink-0" />Adicionar rótulo nutricional</Button>
        {cameraButton}
      </div>
    </div> : <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-medium">Rótulo nutricional</p><p className="text-sm text-muted-foreground">Copie os valores de uma mesma coluna da embalagem.</p></div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{value.conferido && !missing.length ? 'Dados conferidos' : 'Em preenchimento'}</span>
      </div>
      <fieldset disabled={disabled || busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label>Os valores abaixo correspondem a</Label>
          <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
            <AmountInput label="Quantidade de referência" value={value.quantidade_referencia} onChange={amount => update({ quantidade_referencia: amount === 0 ? null : amount })} />
            <select aria-label="Unidade de referência" className="h-11 min-w-0 rounded-md border border-input bg-background px-2 text-sm" value={value.unidade_referencia}
              onChange={event => update({ unidade_referencia: event.target.value as NutritionLabel['unidade_referencia'] })}>
              <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">L</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">Ex.: 100 g ou a porção de 20 g indicada no rótulo.</p>
        </div>
        <div className="min-w-0 space-y-2"><Label htmlFor="nutrition-brand">Marca / apresentação</Label><Input id="nutrition-brand" className="h-11" maxLength={120} value={value.marca} placeholder="Ex.: marca e versão do produto" onChange={event => update({ marca: event.target.value })} /></div>
      </fieldset>

      <fieldset disabled={disabled || busy} className="space-y-3">
        {value.nutrientes.map((row, index) => {
          const nutrient = NUTRIENTS.find(item => item.id === row.nutriente);
          return <div key={index} className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(100px,150px)_50px_44px] sm:items-center">
            <div className="min-w-0 space-y-1 sm:space-y-0">
              <Label className="text-xs sm:sr-only" htmlFor={`nutrition-nutrient-${index}`}>Nutriente</Label>
              <select id={`nutrition-nutrient-${index}`} aria-label={`Nutriente ${index + 1}`} className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm" value={row.nutriente}
                onChange={event => updateRow(index, { nutriente: event.target.value, quantidade: null })}>
                <option value="">Selecione o nutriente</option>
                {NUTRIENTS.map(item => <option key={item.id} value={item.id} disabled={value.nutrientes.some((other, otherIndex) => otherIndex !== index && other.nutriente === item.id)}>{item.nome}</option>)}
              </select>
            </div>
            <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-2 sm:col-auto sm:row-auto">
              <AmountInput label={`Quantidade de ${nutrient?.nome ?? `nutriente ${index + 1}`}`} value={row.quantidade} disabled={!row.nutriente} onChange={amount => updateRow(index, { quantidade: amount })} />
              <span className="w-10 shrink-0 text-sm text-muted-foreground sm:hidden">{nutrient?.unidade ?? '—'}</span>
            </div>
            <span className="hidden text-sm text-muted-foreground sm:block">{nutrient?.unidade ?? '—'}</span>
            <Button type="button" variant="ghost" size="icon" className="col-start-2 row-start-1 h-11 w-11 self-end text-muted-foreground hover:text-destructive sm:col-auto sm:row-auto" aria-label={`Remover ${nutrient?.nome ?? `linha ${index + 1}`}`}
              onClick={() => update({ nutrientes: value.nutrientes.filter((_, rowIndex) => rowIndex !== index) })}><Trash2 className="h-4 w-4" /></Button>
          </div>;
        })}
      </fieldset>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="h-11" disabled={disabled || busy || value.nutrientes.length >= NUTRIENTS.length}
          onClick={() => update({ nutrientes: [...value.nutrientes, { nutriente: '', quantidade: null }] })}><Plus className="mr-2 h-4 w-4" />Adicionar linha</Button>
        {cameraButton}
      </div>
      {busy && <div role="status" className="flex flex-wrap items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{progress ? `Lendo a foto… ${progress}%` : 'Preparando a leitura da foto…'}<Button type="button" variant="ghost" onClick={cancelImport}>Cancelar leitura</Button></div>}
      {notice && <p role="status" className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{notice}</p>}
      {preview && <div className="space-y-2 rounded-lg border p-3"><p className="text-sm font-medium">Foto de referência</p><a href={preview} target="_blank" rel="noreferrer" className="block" aria-label="Ampliar foto do rótulo"><img src={preview} alt="Rótulo nutricional enviado para conferência" className="mx-auto max-h-64 max-w-full rounded object-contain" /></a><p className="text-xs text-muted-foreground">Toque na foto para ampliar e conferir os valores.</p></div>}
      {photoError && <p role="alert" className="text-sm text-muted-foreground">Não foi possível abrir a foto salva. Os dados continuam disponíveis.</p>}
      {missing.length > 0 && <details className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground"><summary className="cursor-pointer">{missing.length} informações pendentes — você pode salvar e continuar depois</summary><p className="mt-2">{missing.join(', ')}.</p></details>}
      <div className="flex items-start gap-2"><Checkbox id="nutrition-reviewed" checked={value.conferido && !missing.length} disabled={disabled || busy || missing.length > 0}
        onCheckedChange={checked => onChange({ ...value, conferido: checked === true })} /><Label htmlFor="nutrition-reviewed" className="text-sm font-normal leading-5">Conferi a quantidade de referência e os valores com a embalagem do produto.</Label></div>
      <p className="text-xs text-muted-foreground">Deixe em branco o que não estiver informado. Preencha 0 somente quando esse for o valor declarado.</p>
    </>}
  </div>;
}
