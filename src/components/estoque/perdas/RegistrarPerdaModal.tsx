import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Package, ChefHat, ChevronsUpDown, Check } from 'lucide-react';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePerdas, MOTIVOS_PERDA, MotivoPerda } from '@/hooks/usePerdas';
import { formatBRL } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

interface ProdutoOpt { id: string; nome: string; custo_unitario: number; unidade_compra: string; estoque_atual: number; }
interface ReceitaOpt { id: string; nome: string; numero_sequencial: number; rendimento_valor: number | null; rendimento_unidade: string | null; }

export function RegistrarPerdaModal({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { registrarPerda, calcularCustoReceita } = usePerdas();
  const [tipo, setTipo] = useState<'produto' | 'receita'>('produto');
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  const [produtoId, setProdutoId] = useState<string>('');
  const [receitaId, setReceitaId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<MotivoPerda>('Vencimento');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [observacao, setObservacao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [saving, setSaving] = useState(false);
  const [custoReceitaUnit, setCustoReceitaUnit] = useState(0);
  const [popoverProdutoOpen, setPopoverProdutoOpen] = useState(false);
  const [popoverReceitaOpen, setPopoverReceitaOpen] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: ps }, { data: rs }] = await Promise.all([
        supabase.from('produtos').select('id, nome, custo_unitario, unidade_compra, estoque_atual').eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('receitas').select('id, nome, numero_sequencial, rendimento_valor, rendimento_unidade').eq('user_id', user.id).order('nome'),
      ]);
      setProdutos((ps as any) || []);
      setReceitas((rs as any) || []);
    })();
  }, [open, user]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setTipo('produto');
      setProdutoId('');
      setReceitaId('');
      setQuantidade(1);
      setMotivo('Vencimento');
      setMotivoOutro('');
      setObservacao('');
      setResponsavel('');
      setCustoReceitaUnit(0);
    }
  }, [open]);

  // Calcular custo unitário quando receita selecionada
  useEffect(() => {
    if (tipo === 'receita' && receitaId) {
      (async () => {
        const custoTotal = await calcularCustoReceita(receitaId);
        const r = receitas.find(x => x.id === receitaId);
        const rendimento = r?.rendimento_valor && r.rendimento_valor > 0 ? r.rendimento_valor : 1;
        setCustoReceitaUnit(custoTotal / rendimento);
      })();
    } else {
      setCustoReceitaUnit(0);
    }
  }, [receitaId, tipo, receitas]);

  const produtoSel = useMemo(() => produtos.find(p => p.id === produtoId), [produtos, produtoId]);
  const receitaSel = useMemo(() => receitas.find(r => r.id === receitaId), [receitas, receitaId]);

  const custoUnit = tipo === 'produto' ? (produtoSel?.custo_unitario || 0) : custoReceitaUnit;
  const custoTotal = quantidade * custoUnit;

  const podeSalvar = quantidade > 0 && (tipo === 'produto' ? !!produtoId : !!receitaId) && (motivo !== 'Outro' || motivoOutro.trim().length > 0);

  const handleSalvar = async () => {
    if (!podeSalvar) return;
    setSaving(true);
    const item = tipo === 'produto' ? produtoSel : receitaSel;
    const ok = await registrarPerda({
      tipo,
      produto_id: tipo === 'produto' ? produtoId : null,
      receita_id: tipo === 'receita' ? receitaId : null,
      nome_item: item?.nome || '',
      quantidade,
      custo_unitario: custoUnit,
      motivo,
      motivo_outro: motivoOutro,
      observacao,
      responsavel,
    });
    setSaving(false);
    if (ok) {
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Perda</DialogTitle>
        </DialogHeader>

        <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'produto' | 'receita')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="produto" className="gap-2"><Package className="h-4 w-4" /> Produto</TabsTrigger>
            <TabsTrigger value="receita" className="gap-2"><ChefHat className="h-4 w-4" /> Receita</TabsTrigger>
          </TabsList>

          <TabsContent value="produto" className="space-y-2">
            <Label>Produto</Label>
            <Popover open={popoverProdutoOpen} onOpenChange={setPopoverProdutoOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {produtoSel ? produtoSel.nome : 'Selecionar produto...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar produto..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto.</CommandEmpty>
                    <CommandGroup>
                      {produtos.map(p => (
                        <CommandItem key={p.id} value={p.nome} onSelect={() => { setProdutoId(p.id); setPopoverProdutoOpen(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', produtoId === p.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex-1 truncate">{p.nome}</span>
                          <span className="text-xs text-muted-foreground ml-2">Estq: {p.estoque_atual}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>

          <TabsContent value="receita" className="space-y-2">
            <Label>Receita</Label>
            <Popover open={popoverReceitaOpen} onOpenChange={setPopoverReceitaOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {receitaSel ? `#${receitaSel.numero_sequencial} ${receitaSel.nome}` : 'Selecionar receita...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar receita..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma receita.</CommandEmpty>
                    <CommandGroup>
                      {receitas.map(r => (
                        <CommandItem key={r.id} value={`${r.numero_sequencial} ${r.nome}`} onSelect={() => { setReceitaId(r.id); setPopoverReceitaOpen(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', receitaId === r.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex-1 truncate">#{r.numero_sequencial} {r.nome}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {receitaSel && (
              <p className="text-xs text-muted-foreground">
                Custo unitário estimado: <span className="font-semibold text-foreground">{formatBRL(custoReceitaUnit)}</span>
                {receitaSel.rendimento_unidade && ` / ${receitaSel.rendimento_unidade}`}
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <NumericInputPtBr value={quantidade} onChange={setQuantidade} decimals={2} />
          </div>
          <div className="space-y-2">
            <Label>Custo total</Label>
            <Input value={formatBRL(custoTotal)} disabled className="bg-muted/40 font-semibold" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Motivo</Label>
          <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoPerda)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOTIVOS_PERDA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {motivo === 'Outro' && (
            <Input placeholder="Descreva o motivo" value={motivoOutro} onChange={e => setMotivoOutro(e.target.value)} />
          )}
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input placeholder="Quem registrou a perda" value={responsavel} onChange={e => setResponsavel(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Observação</Label>
          <Textarea rows={2} value={observacao} onChange={e => setObservacao(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!podeSalvar || saving}>{saving ? 'Salvando...' : 'Registrar Perda'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
