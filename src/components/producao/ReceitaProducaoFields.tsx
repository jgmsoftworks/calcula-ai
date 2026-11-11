import { ChefHat } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatarRendimento, rendimentoPrevisto, type ReceitaRendimento } from '@/lib/producaoRendimento';

export function ReceitaProducaoFields({ receitas, receitaId, quantidade, onRecipeChange, onQuantityChange, disabled = false }: {
  receitas: ReceitaRendimento[]; receitaId: string; quantidade: number;
  disabled?: boolean;
  onRecipeChange: (id: string) => void; onQuantityChange: (value: number) => void;
}) {
  const receita = receitas.find(item => item.id === receitaId);
  const previsto = rendimentoPrevisto(receita, quantidade);
  return <div className="min-w-0 space-y-3">
    <div className="space-y-2">
      <Label htmlFor="producao-receita">Receita (opcional)</Label>
      <Select value={receitaId || '__none__'} onValueChange={value => onRecipeChange(value === '__none__' ? '' : value)} disabled={disabled}>
        <SelectTrigger id="producao-receita" className="h-auto min-h-[46px] [&>span:first-child]:whitespace-normal [&>span:first-child]:break-words"><SelectValue placeholder="Selecione uma receita">{receita?.nome || (receitaId ? 'Receita indisponível' : 'Sem receita')}</SelectValue></SelectTrigger>
        <SelectContent searchable searchPlaceholder="Buscar receita…" searchLabel="Buscar receita" viewportClassName="max-h-52">
          <SelectItem value="__none__">Sem receita</SelectItem>
          {receitas.map(item => <SelectItem key={item.id} value={item.id} textValue={item.nome}>
            <span className="flex min-w-0 items-center gap-3">
              {item.imagem_url ? <img src={item.imagem_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-5 w-5" /></span>}
              <span className="min-w-0 whitespace-normal"><span className="block break-words font-medium">{item.nome}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{rendimentoPrevisto(item) !== null ? `Rende ${formatarRendimento(item.rendimento_valor!)} ${item.rendimento_unidade}` : 'Rendimento não cadastrado'}</span>
              </span>
            </span>
          </SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {receitaId && <div className="rounded-xl border bg-primary/[0.03] p-4">
      {receita && <div className="mb-4 flex min-w-0 items-start gap-3">
        {receita.imagem_url ? <img src={receita.imagem_url} alt={receita.nome} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-5 w-5" /></span>}
        <div className="min-w-0"><p className="break-words text-sm font-medium">{receita.nome}</p>
          <p className="mt-1 text-sm text-muted-foreground">Uma receita rende <strong className="text-foreground">{rendimentoPrevisto(receita) !== null ? `${formatarRendimento(receita.rendimento_valor!)} ${receita.rendimento_unidade}` : '—'}</strong></p>
        </div>
      </div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2"><Label htmlFor="producao-vezes">Vezes da receita</Label><NumericInputPtBr id="producao-vezes" tipo="quantidade_continua" value={quantidade} onChange={onQuantityChange} placeholder="" disabled={disabled} /></div>
        <div className="space-y-2"><Label htmlFor="producao-previsto">Rendimento previsto</Label><Input id="producao-previsto" readOnly value={previsto === null ? '' : `${formatarRendimento(previsto)} ${receita?.rendimento_unidade}`} className="font-semibold text-primary" /></div>
      </div>
      {rendimentoPrevisto(receita) === null && <p role="alert" className="mt-3 text-sm text-destructive">Cadastre o rendimento e a unidade na receita antes de usá-la na produção.</p>}
    </div>}
  </div>;
}
