import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface ProdutoOpt {
  id: string;
  nome: string;
  custo_unitario: number;
  unidade_compra: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  imagem_url: string | null;
  marcas: string[] | null;
  categorias: string[] | null;
}
interface ReceitaOpt { id: string; nome: string; numero_sequencial: number; rendimento_valor: number | null; rendimento_unidade: string | null; }
interface FuncionarioOpt { id: string; nome: string; cargo: string | null; }

const RESPONSAVEL_OUTRO = '__outro__';

export function RegistrarPerdaModal({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { registrarPerda, calcularCustoReceita } = usePerdas();
  const [tipo, setTipo] = useState<'produto' | 'receita'>('produto');
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [receitas, setReceitas] = useState<ReceitaOpt[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioOpt[]>([]);
  const [produtoId, setProdutoId] = useState<string>('');
  const [receitaId, setReceitaId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState<MotivoPerda>('Vencimento');
  const [motivoOutro, setMotivoOutro] = useState('');
  const [observacao, setObservacao] = useState('');
  const [responsavelSel, setResponsavelSel] = useState<string>('');
  const [responsavelOutro, setResponsavelOutro] = useState('');
  const [saving, setSaving] = useState(false);
  const [custoReceitaUnit, setCustoReceitaUnit] = useState(0);
  const [popoverProdutoOpen, setPopoverProdutoOpen] = useState(false);
  const [popoverReceitaOpen, setPopoverReceitaOpen] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: ps }, { data: rs }, { data: fs }] = await Promise.all([
        supabase.from('produtos')
          .select('id, nome, custo_unitario, unidade_compra, estoque_atual, estoque_minimo, imagem_url, marcas, categorias')
          .eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('receitas')
          .select('id, nome, numero_sequencial, rendimento_valor, rendimento_unidade')
          .eq('user_id', user.id).order('nome'),
        supabase.from('folha_pagamento')
          .select('id, nome, cargo')
          .eq('user_id', user.id).eq('ativo', true).order('nome'),
      ]);
      setProdutos((ps as any) || []);
      setReceitas((rs as any) || []);
      setFuncionarios((fs as any) || []);
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
      setResponsavelSel('');
      setResponsavelOutro('');
      setCustoReceitaUnit(0);
    }
  }, [open]);

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

  const responsavelFinal = responsavelSel === RESPONSAVEL_OUTRO
    ? responsavelOutro.trim()
    : (funcionarios.find(f => f.id === responsavelSel)?.nome || '');

  const podeSalvar =
    quantidade > 0 &&
    (tipo === 'produto' ? !!produtoId : !!receitaId) &&
    (motivo !== 'Outro' || motivoOutro.trim().length > 0);

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
      responsavel: responsavelFinal,
    });
    setSaving(false);
    if (ok) {
      onSaved();
      onOpenChange(false);
    }
  };

  // Garante scroll com a roda do mouse dentro do Popover
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.currentTarget.scrollTop += e.deltaY;
    e.stopPropagation();
  };

  const estoqueBadge = (p: ProdutoOpt) => {
    const qtd = p.estoque_atual ?? 0;
    const min = p.estoque_minimo ?? 0;
    const variant: 'destructive' | 'secondary' | 'outline' =
      qtd <= 0 ? 'destructive' : (min > 0 && qtd <= min ? 'secondary' : 'outline');
    return (
      <Badge variant={variant} className="text-[10px] px-1.5 py-0 shrink-0 whitespace-nowrap">
        {qtd} {p.unidade_compra}
      </Badge>
    );
  };

  const tagBadge = (label: string, key: 'marca' | 'categoria') => (
    <Badge
      key={`${key}-${label}`}
      variant={key === 'marca' ? 'secondary' : 'outline'}
      className="text-[10px] px-1 py-0 max-w-[7rem] truncate"
      title={label}
    >
      {label}
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-1">
          <DialogTitle>Registrar Perda</DialogTitle>
        </DialogHeader>

        <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'produto' | 'receita')} className="space-y-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="produto" className="gap-2"><Package className="h-4 w-4" /> Produto</TabsTrigger>
            <TabsTrigger value="receita" className="gap-2"><ChefHat className="h-4 w-4" /> Receita</TabsTrigger>
          </TabsList>

          <TabsContent value="produto" className="space-y-2 mt-0">
            <Label>Produto</Label>
            <Popover open={popoverProdutoOpen} onOpenChange={setPopoverProdutoOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                  {produtoSel ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {produtoSel.imagem_url ? (
                        <img src={produtoSel.imagem_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate text-left text-sm">{produtoSel.nome}</span>
                    </div>
                  ) : (
                    'Selecionar produto...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[--radix-popover-trigger-width] max-w-[min(95vw,26rem)]"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions
                collisionPadding={8}
              >
                <Command>
                  <CommandInput placeholder="Buscar por nome, marca ou categoria..." />
                  <CommandList onWheel={handleWheel} className="max-h-[260px] overflow-y-auto">
                    <CommandEmpty>Nenhum produto.</CommandEmpty>
                    <CommandGroup>
                      {produtos.map(p => {
                        const searchValue = [p.nome, ...(p.marcas || []), ...(p.categorias || [])].join(' ').toLowerCase();
                        return (
                          <CommandItem
                            key={p.id}
                            value={searchValue}
                            onSelect={() => { setProdutoId(p.id); setPopoverProdutoOpen(false); }}
                            className="items-center gap-2 py-1.5 px-2 cursor-pointer"
                          >
                          <Check className={cn('h-4 w-4 shrink-0', produtoId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.imagem_url ? (
                            <img src={p.imagem_url} alt="" className="h-9 w-9 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate">{p.nome}</span>
                              {estoqueBadge(p)}
                            </div>
                            {(p.marcas?.length || p.categorias?.length) ? (
                              <div className="flex flex-wrap gap-1">
                                {p.marcas?.slice(0, 1).map(m => tagBadge(m, 'marca'))}
                                {p.categorias?.slice(0, 1).map(c => tagBadge(c, 'categoria'))}
                              </div>
                            ) : null}
                          </div>
                        </CommandItem>
                      );
                    })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </TabsContent>

          <TabsContent value="receita" className="space-y-2 mt-0">
            <Label>Receita</Label>
            <Popover open={popoverReceitaOpen} onOpenChange={setPopoverReceitaOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                  {receitaSel ? (
                    <span className="truncate text-sm">#{receitaSel.numero_sequencial} {receitaSel.nome}</span>
                  ) : (
                    'Selecionar receita...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[--radix-popover-trigger-width] max-w-[min(95vw,26rem)]"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions
                collisionPadding={8}
              >
                <Command>
                  <CommandInput placeholder="Buscar receita..." />
                  <CommandList onWheel={handleWheel} className="max-h-[260px] overflow-y-auto">
                    <CommandEmpty>Nenhuma receita.</CommandEmpty>
                    <CommandGroup>
                      {receitas.map(r => (
                        <CommandItem
                          key={r.id}
                          value={`${r.numero_sequencial} ${r.nome}`}
                          onSelect={() => { setReceitaId(r.id); setPopoverReceitaOpen(false); }}
                          className="items-center justify-between gap-2 py-1.5 px-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Check className={cn('h-4 w-4 shrink-0', receitaId === r.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="text-sm truncate">#{r.numero_sequencial} {r.nome}</span>
                          </div>
                          {r.rendimento_valor ? (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                              {r.rendimento_valor}{r.rendimento_unidade ? ` ${r.rendimento_unidade}` : ''}
                            </span>
                          ) : null}
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
            <NumericInputPtBr tipo="quantidade_continua" value={quantidade} onChange={setQuantidade} />
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
          <Select value={responsavelSel} onValueChange={setResponsavelSel}>
            <SelectTrigger>
              <SelectValue placeholder={funcionarios.length ? 'Selecione um funcionário' : 'Nenhum funcionário cadastrado'} />
            </SelectTrigger>
            <SelectContent>
              {funcionarios.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}{f.cargo ? ` — ${f.cargo}` : ''}
                </SelectItem>
              ))}
              <SelectItem value={RESPONSAVEL_OUTRO}>Outro (digitar)</SelectItem>
            </SelectContent>
          </Select>
          {responsavelSel === RESPONSAVEL_OUTRO && (
            <Input
              placeholder="Nome do responsável"
              value={responsavelOutro}
              onChange={e => setResponsavelOutro(e.target.value)}
            />
          )}
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
