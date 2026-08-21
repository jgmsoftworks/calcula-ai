import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Package, ChefHat, ChevronsUpDown, Check, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePerdas, MOTIVOS_PERDA, MotivoPerda } from '@/hooks/usePerdas';
import { formatBRL } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
interface ItemPerda {
  id: string;
  tipo: 'produto' | 'receita';
  nome: string;
  quantidade: number;
  custoUnitario: number;
}

const RESPONSAVEL_OUTRO = '__outro__';

export function RegistrarPerdaModal({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { registrarPerda, calcularCustoReceita } = usePerdas();
  const [etapa, setEtapa] = useState<'tipo' | 'formulario'>('tipo');
  const [tipo, setTipo] = useState<'produto' | 'receita'>('produto');
  const [itens, setItens] = useState<ItemPerda[]>([]);
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
  const [confirmacaoOpen, setConfirmacaoOpen] = useState(false);
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
      setEtapa('tipo');
      setItens([]);
      setProdutoId('');
      setReceitaId('');
      setQuantidade(1);
      setMotivo('Vencimento');
      setMotivoOutro('');
      setObservacao('');
      setResponsavelSel('');
      setResponsavelOutro('');
      setCustoReceitaUnit(0);
      setConfirmacaoOpen(false);
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
  const custoTotalLote = itens.reduce((total, item) => total + item.quantidade * item.custoUnitario, 0);

  const responsavelFinal = responsavelSel === RESPONSAVEL_OUTRO
    ? responsavelOutro.trim()
    : (funcionarios.find(f => f.id === responsavelSel)?.nome || '');

  const podeAdicionar =
    quantidade > 0 &&
    (tipo === 'produto' ? !!produtoId : !!receitaId);

  const podeSalvar =
    itens.length > 0 &&
    (motivo !== 'Outro' || motivoOutro.trim().length > 0);

  const escolherTipo = (novoTipo: 'produto' | 'receita') => {
    setTipo(novoTipo);
    setItens([]);
    setProdutoId('');
    setReceitaId('');
    setQuantidade(1);
    setEtapa('formulario');
  };

  const adicionarItem = () => {
    if (!podeAdicionar) return;
    const selecionado = tipo === 'produto' ? produtoSel : receitaSel;
    if (!selecionado) return;

    setItens(atuais => {
      const existente = atuais.find(item => item.id === selecionado.id);
      if (existente) {
        return atuais.map(item => item.id === selecionado.id
          ? { ...item, quantidade: item.quantidade + quantidade }
          : item);
      }
      return [...atuais, {
        id: selecionado.id,
        tipo,
        nome: selecionado.nome,
        quantidade,
        custoUnitario: custoUnit,
      }];
    });

    setProdutoId('');
    setReceitaId('');
    setQuantidade(1);
  };

  const removerItem = (id: string) => setItens(atuais => atuais.filter(item => item.id !== id));

  const handleSalvar = async () => {
    if (!podeSalvar) return;
    setConfirmacaoOpen(true);
  };

  const confirmarRegistro = async (baixarEstoque: boolean) => {
    if (!podeSalvar) return;
    setSaving(true);
    const resultados: boolean[] = [];
    for (const item of itens) {
      resultados.push(await registrarPerda({
        tipo: item.tipo,
        produto_id: item.tipo === 'produto' ? item.id : null,
        receita_id: item.tipo === 'receita' ? item.id : null,
        nome_item: item.nome,
        quantidade: item.quantidade,
        custo_unitario: item.custoUnitario,
        motivo,
        motivo_outro: motivoOutro,
        observacao,
        responsavel: responsavelFinal,
        baixar_estoque: baixarEstoque,
      }, { silent: true }));
    }
    setSaving(false);
    const salvos = resultados.filter(Boolean).length;
    if (salvos === itens.length) {
      toast.success(baixarEstoque
        ? `${salvos} ${salvos === 1 ? 'perda registrada' : 'perdas registradas'} e estoque atualizado`
        : `${salvos} ${salvos === 1 ? 'perda registrada' : 'perdas registradas'} sem movimentar o estoque`);
      setConfirmacaoOpen(false);
      onSaved();
      onOpenChange(false);
    } else {
      setItens(atuais => atuais.filter((_, index) => !resultados[index]));
      toast.error(`${salvos} de ${itens.length} perdas foram registradas. Tente novamente para os itens restantes.`);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-1">
          <DialogTitle>{etapa === 'tipo' ? 'O que você perdeu?' : `Registrar perda de ${tipo === 'produto' ? 'produtos' : 'receitas'}`}</DialogTitle>
        </DialogHeader>

        {etapa === 'tipo' ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Primeiro, escolha de onde vêm os itens que serão registrados como perda.
            </p>
            <button
              type="button"
              onClick={() => escolherTipo('produto')}
              className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-start gap-3">
                <span className="rounded-lg bg-blue-500/10 p-2 text-blue-600"><Package className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold">Produtos do estoque</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Itens cadastrados diretamente na Lista de Produtos, como ingredientes, embalagens e materiais.
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => escolherTipo('receita')}
              className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-start gap-3">
                <span className="rounded-lg bg-orange-500/10 p-2 text-orange-600"><ChefHat className="h-5 w-5" /></span>
                <span>
                  <span className="block font-semibold">Receitas produzidas</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Itens criados na aba Receitas, como bolos, doces, massas e outros produtos preparados.
                  </span>
                </span>
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              Você poderá adicionar vários itens de uma vez. No histórico, cada perda ficará separada para consulta ou exclusão individual.
            </p>
          </div>
        ) : (
          <>
          <Button variant="ghost" size="sm" onClick={() => setEtapa('tipo')} disabled={saving} className="w-fit -ml-2 gap-1">
            <ArrowLeft className="h-4 w-4" /> Alterar tipo de perda
          </Button>

          {tipo === 'produto' ? (
          <div className="space-y-2">
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
          </div>
          ) : (
          <div className="space-y-2">
            <Label>Receita</Label>
            <Popover open={popoverReceitaOpen} onOpenChange={setPopoverReceitaOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                  {receitaSel ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="truncate text-left text-sm">#{receitaSel.numero_sequencial} {receitaSel.nome}</span>
                    </div>
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
                          className="items-center gap-2 py-1.5 px-2 cursor-pointer"
                        >
                          <Check className={cn('h-4 w-4 shrink-0', receitaId === r.id ? 'opacity-100' : 'opacity-0')} />
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                            <ChefHat className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate">#{r.numero_sequencial} {r.nome}</span>
                              {r.rendimento_valor ? (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 whitespace-nowrap">
                                  {r.rendimento_valor}{r.rendimento_unidade ? ` ${r.rendimento_unidade}` : ''}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
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
          </div>
          )}

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

        <Button type="button" variant="secondary" onClick={adicionarItem} disabled={!podeAdicionar} className="w-full gap-2">
          <Plus className="h-4 w-4" /> Adicionar {tipo === 'produto' ? 'produto' : 'receita'} à lista
        </Button>

        {itens.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <Label>{itens.length} {itens.length === 1 ? 'item adicionado' : 'itens adicionados'}</Label>
              <span className="text-sm font-semibold">{formatBRL(custoTotalLote)}</span>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {itens.map(item => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-background p-2">
                  {item.tipo === 'produto'
                    ? <Package className="h-4 w-4 shrink-0 text-blue-600" />
                    : <ChefHat className="h-4 w-4 shrink-0 text-orange-600" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantidade} · {formatBRL(item.quantidade * item.custoUnitario)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Cada item será salvo separadamente no histórico.</p>
          </div>
        )}

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
          <Button onClick={handleSalvar} disabled={!podeSalvar || saving}>{saving ? 'Salvando...' : `Registrar ${itens.length || ''} ${itens.length === 1 ? 'perda' : 'perdas'}`}</Button>
        </DialogFooter>
          </>
        )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmacaoOpen} onOpenChange={(value) => !saving && setConfirmacaoOpen(value)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja dar baixa no estoque?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {itens.length === 1 ? 'A perda selecionada será registrada' : `As ${itens.length} perdas selecionadas serão registradas`} de qualquer forma, cada uma separadamente no histórico.
              </span>
              <span className="block">
                {tipo === 'produto'
                  ? 'Ao dar baixa, a quantidade será descontada do produto e aparecerá no histórico de Movimentações.'
                  : 'Ao dar baixa, os ingredientes usados na receita serão descontados e aparecerão no histórico de Movimentações.'}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:flex-col sm:space-x-0 sm:gap-2">
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); confirmarRegistro(true); }}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Registrando...' : 'Sim, dar baixa no estoque'}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); confirmarRegistro(false); }}
              disabled={saving}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {saving ? 'Registrando...' : 'Não, somente registrar a perda'}
            </AlertDialogAction>
            <AlertDialogCancel disabled={saving} className="w-full mt-0">Voltar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
