import { fetchGeladeira, geladeiraComoProduto } from '@/lib/geladeiraData';
import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
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
import { Package, ChefHat, Refrigerator, ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
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
  custo_indisponivel?: boolean;
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
interface ReceitaOpt {
  id: string;
  nome: string;
  numero_sequencial: number;
  rendimento_valor: number | null;
  rendimento_unidade: string | null;
  imagem_url: string | null;
  tipo_produto: string | null;
  peso_unitario: number | null;
  preco_venda: number | null;
  custo_total: number;
}
interface FuncionarioOpt { id: string; nome: string; cargo: string | null; }
interface ItemPerda {
  id: string;
  tipo: 'produto' | 'receita' | 'geladeira';
  nome: string;
  quantidade: number;
  custoUnitario: number;
}

const RESPONSAVEL_OUTRO = '__outro__';

const normalizarBusca = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const distanciaEdicaoAteUm = (a: string, b: string) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let diferencas = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    diferencas += 1;
    if (diferencas > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else { i += 1; j += 1; }
  }
  return diferencas + Number(i < a.length || j < b.length) <= 1;
};

const termoEhSubsequencia = (termo: string, palavra: string) => {
  let indice = 0;
  for (const caractere of palavra) {
    if (caractere === termo[indice]) indice += 1;
    if (indice === termo.length) return true;
  }
  return termo.length === 0;
};

const correspondeBusca = (conteudo: unknown[], busca: string) => {
  const consulta = normalizarBusca(busca);
  if (!consulta) return true;
  const texto = normalizarBusca(conteudo.join(' '));
  const palavras = texto.split(/\s+/).filter(Boolean);
  return consulta.split(/\s+/).every(termo =>
    texto.includes(termo) || palavras.some(palavra =>
      termoEhSubsequencia(termo, palavra) || (termo.length >= 4 && distanciaEdicaoAteUm(termo, palavra)),
    ),
  );
};

export function RegistrarPerdaModal({ open, onOpenChange, onSaved }: Props) {
  usePortugalTranslation();
  const { user } = useAuth();
  const { registrarPerdas, calcularCustoReceita } = usePerdas();
  const [etapa, setEtapa] = useState<'tipo' | 'formulario'>('tipo');
  const [tipo, setTipo] = useState<'produto' | 'receita' | 'geladeira'>('produto');
  const [itens, setItens] = useState<ItemPerda[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [geladeira, setGeladeira] = useState<ProdutoOpt[]>([]);
  const [geladeiraErro, setGeladeiraErro] = useState(false);
  const [geladeiraLoading, setGeladeiraLoading] = useState(false);
  const produtosDisponiveis = tipo === 'geladeira' ? geladeira : produtos;
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
  const [busca, setBusca] = useState('');
  const [itemModalOpen, setItemModalOpen] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    let active = true;
    (async () => {
      const [{ data: ps }, { data: rs }, { data: fs }] = await Promise.all([
        supabase.from('produtos')
          .select('id, nome, custo_unitario, unidade_compra, estoque_atual, estoque_minimo, imagem_url, marcas, categorias')
          .eq('user_id', user.id).eq('ativo', true).order('nome'),
        supabase.from('receitas')
          .select('id, nome, numero_sequencial, rendimento_valor, rendimento_unidade, imagem_url, tipo_produto, peso_unitario, preco_venda')
          .eq('user_id', user.id).order('nome'),
        supabase.from('folha_pagamento')
          .select('id, nome, cargo')
          .eq('user_id', user.id).eq('ativo', true).order('nome'),
      ]);
      if (!active) return;
      setProdutos(ps || []);
      const receitasComCusto = await Promise.all((rs || []).map(async (receita) => {
        const { data: custo } = await supabase.rpc('calcular_custo_receita', { p_receita_id: receita.id });
        return { ...receita, custo_total: Number(custo) || 0 };
      }));
      if (active) {
        setReceitas(receitasComCusto);
        setFuncionarios(fs || []);
      }
    })();
    return () => { active = false; };
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !user?.id) return;
    let active = true;
    setGeladeiraLoading(true); setGeladeiraErro(false); setGeladeira([]);
    fetchGeladeira(user.id).then(items => { if (active) setGeladeira(items.map(geladeiraComoProduto)); })
      .catch(() => { if (active) setGeladeiraErro(true); })
      .finally(() => { if (active) setGeladeiraLoading(false); });
    return () => { active = false; };
  }, [open, user?.id]);

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
      setBusca('');
      setItemModalOpen(false);
    }
  }, [open]);

  useEffect(() => {
    let active = true;
    if (tipo === 'receita' && receitaId) {
      (async () => {
        const custoTotal = await calcularCustoReceita(receitaId);
        const r = receitas.find(x => x.id === receitaId);
        const rendimento = r?.rendimento_valor && r.rendimento_valor > 0 ? r.rendimento_valor : 1;
        if (active) setCustoReceitaUnit(custoTotal / rendimento);
      })();
    } else {
      setCustoReceitaUnit(0);
    }
    return () => { active = false; };
  }, [receitaId, tipo, receitas, calcularCustoReceita]);

  const produtoSel = useMemo(() => produtosDisponiveis.find(p => p.id === produtoId), [produtosDisponiveis, produtoId]);
  const receitaSel = useMemo(() => receitas.find(r => r.id === receitaId), [receitas, receitaId]);

  const itensFiltrados = useMemo(() => {
    if (tipo !== 'receita') {
      return produtosDisponiveis.filter(p => correspondeBusca([p.nome, ...(p.marcas || []), ...(p.categorias || [])], busca));
    }
    return receitas.filter(r => correspondeBusca([r.nome, r.numero_sequencial, r.tipo_produto], busca));
  }, [busca, produtosDisponiveis, receitas, tipo]);

  const custoUnit = tipo !== 'receita'
    ? (produtoSel?.custo_unitario || 0)
    : (receitaSel?.rendimento_valor && receitaSel.rendimento_valor > 0
      ? receitaSel.custo_total / receitaSel.rendimento_valor
      : receitaSel?.custo_total || custoReceitaUnit);
  const custoTotal = quantidade * custoUnit;
  const custoTotalLote = itens.reduce((total, item) => total + item.quantidade * item.custoUnitario, 0);

  const responsavelFinal = responsavelSel === RESPONSAVEL_OUTRO
    ? responsavelOutro.trim()
    : (funcionarios.find(f => f.id === responsavelSel)?.nome || '');

  const podeAdicionar =
    Number.isFinite(quantidade) && quantidade > 0 && !(tipo === 'geladeira' && produtoSel?.custo_indisponivel) &&
    (tipo !== 'receita' ? !!produtoId : !!receitaId);

  const podeSalvar =
    itens.length > 0 &&
    (motivo !== 'Outro' || motivoOutro.trim().length > 0);

  const escolherTipo = (novoTipo: 'produto' | 'receita' | 'geladeira') => {
    setTipo(novoTipo);
    setItens([]);
    setProdutoId('');
    setReceitaId('');
    setQuantidade(1);
    setBusca('');
    setEtapa('formulario');
  };

  const adicionarItem = () => {
    if (!podeAdicionar) return;
    const selecionado = tipo !== 'receita' ? produtoSel : receitaSel;
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
    setItemModalOpen(false);
  };

  const abrirItemParaAdicionar = (id: string) => {
    if (tipo !== 'receita') setProdutoId(id);
    else setReceitaId(id);
    setQuantidade(1);
    setItemModalOpen(true);
  };

  const removerItem = (id: string) => setItens(atuais => atuais.filter(item => item.id !== id));

  const handleSalvar = async () => {
    if (!podeSalvar) return;
    setConfirmacaoOpen(true);
  };

  const confirmarRegistro = async (baixarEstoque: boolean) => {
    if (!podeSalvar) return;
    setSaving(true);
    const salvo = await registrarPerdas(itens.map(item => ({
        tipo: item.tipo,
        produto_id: item.tipo === 'produto' ? item.id : null,
        geladeira_item_id: item.tipo === 'geladeira' ? item.id : null,
        receita_id: item.tipo === 'receita' ? item.id : null,
        nome_item: item.nome,
        quantidade: item.quantidade,
        custo_unitario: item.custoUnitario,
        motivo,
        motivo_outro: motivoOutro,
        observacao,
        responsavel: responsavelFinal,
        baixar_estoque: baixarEstoque,
      })), { silent: true });
    setSaving(false);
    if (salvo) {
      toast.success(baixarEstoque
        ? `${itens.length} ${itens.length === 1 ? 'perda registrada' : 'perdas registradas'} e estoque atualizado`
        : `${itens.length} ${itens.length === 1 ? 'perda registrada' : 'perdas registradas'} sem movimentar o estoque`);
      setConfirmacaoOpen(false);
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'w-[calc(100vw-2rem)] max-h-[88vh] overflow-x-hidden overflow-y-auto p-5 sm:p-6',
            etapa === 'tipo'
              ? 'max-w-xl'
              : 'max-w-4xl sm:top-6 sm:h-[min(42rem,calc(100vh-3rem))] sm:translate-y-0',
          )}
        >
        <DialogHeader className="mb-1">
          <DialogTitle className="flex items-center gap-2">
            {etapa === 'formulario' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEtapa('tipo')}
                disabled={saving}
                aria-label="Alterar tipo de perda"
                title="Alterar tipo de perda"
                className="h-8 w-8 shrink-0 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>{etapa === 'tipo' ? 'O que você perdeu?' : `Registrar perda de ${tipo === 'geladeira' ? 'itens da Geladeira' : tipo === 'produto' ? 'produtos' : 'receitas'}`}</span>
          </DialogTitle>
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
                  <span className="block font-semibold">{localizeText("Produtos do estoque")}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{localizeText("Itens cadastrados diretamente na Lista de Produtos, como ingredientes, embalagens e materiais.")}</span>
                </span>
              </span>
            </button>
            <button type="button" onClick={() => escolherTipo('geladeira')}
              className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex items-start gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Refrigerator className="h-5 w-5" /></span>
                <span><span className="block font-semibold">Geladeira</span><span className="mt-1 block text-sm text-muted-foreground">Receitas e sub-receitas armazenadas. A baixa desconta o saldo da Geladeira.</span></span>
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
                    Produção que não está armazenada na Geladeira. Ao dar baixa, os ingredientes da receita são descontados.
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
          {tipo === 'geladeira' && geladeiraErro && <p role="alert" className="text-sm text-destructive">Não foi possível carregar a Geladeira. Feche e abra novamente para tentar.</p>}
          {tipo === 'geladeira' && geladeiraLoading && <p role="status" className="text-sm text-muted-foreground">Carregando Geladeira…</p>}
          <div className="space-y-3 rounded-xl border bg-muted/10 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={event => setBusca(event.target.value)}
                placeholder={`Buscar ${tipo !== 'receita' ? 'produto, marca ou categoria' : 'receita ou categoria'}...`}
                className="pl-9"
              />
            </div>
            <div className="h-[min(17.5rem,40vh)] min-h-48 space-y-2 overflow-y-auto pr-1 sm:h-[17.5rem]">
              {tipo !== 'receita' ? (
                (itensFiltrados as ProdutoOpt[]).length === 0 ? (
                  <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                ) : (itensFiltrados as ProdutoOpt[]).map(produto => (
                  <div key={produto.id} className="flex h-[5.5rem] w-full items-center gap-3 overflow-hidden rounded-xl border bg-background p-3">
                    {produto.imagem_url
                      ? <img src={produto.imagem_url} alt={produto.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600"><Package className="h-6 w-6" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{produto.nome}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {produto.categorias?.slice(0, 2).map(categoria => <Badge key={categoria} variant="outline" className="text-[10px]">{categoria}</Badge>)}
                        {produto.marcas?.slice(0, 1).map(marca => <Badge key={marca} variant="secondary" className="text-[10px]">{marca}</Badge>)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{localizeText("Estoque:")} {produto.estoque_atual} {produto.unidade_compra} · Custo: {produto.custo_indisponivel ? 'Indisponível: ajuste o rendimento' : formatBRL(produto.custo_unitario)}</p>
                    </div>
                    <Button type="button" size="icon" onClick={() => abrirItemParaAdicionar(produto.id)} aria-label={`Adicionar ${produto.nome}`} className="h-9 w-9 shrink-0 rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                (itensFiltrados as ReceitaOpt[]).length === 0 ? (
                  <p className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">Nenhuma receita encontrada.</p>
                ) : (itensFiltrados as ReceitaOpt[]).map(receita => (
                  <div key={receita.id} className="flex h-[5.5rem] w-full items-center gap-3 overflow-hidden rounded-xl border bg-background p-3">
                    {receita.imagem_url
                      ? <img src={receita.imagem_url} alt={receita.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600"><ChefHat className="h-6 w-6" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">#{receita.numero_sequencial} {receita.nome}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {receita.tipo_produto && <Badge variant="outline" className="text-[10px]">{receita.tipo_produto}</Badge>}
                        {receita.rendimento_valor && <Badge variant="secondary" className="text-[10px]">Rende {receita.rendimento_valor} {receita.rendimento_unidade || 'un'}</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Custo da produção: {formatBRL(receita.custo_total)}{receita.rendimento_valor && receita.rendimento_valor > 0 ? ` · ${formatBRL(receita.custo_total / receita.rendimento_valor)} por ${receita.rendimento_unidade || 'un'}` : ''}</p>
                    </div>
                    <Button type="button" size="icon" onClick={() => abrirItemParaAdicionar(receita.id)} aria-label={`Adicionar ${receita.nome}`} className="h-9 w-9 shrink-0 rounded-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex h-[12rem] flex-col gap-2 rounded-xl border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3"><Label>Itens desta perda ({itens.length})</Label><span className="text-sm font-semibold">{formatBRL(custoTotalLote)}</span></div>
            <div className="h-[7rem] space-y-2 overflow-y-auto pr-1">
              {itens.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed bg-background/50 px-4 text-center text-xs text-muted-foreground">Clique no + de um item para adicioná-lo.</div>
              ) : itens.map(item => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-background p-2">
                  {item.tipo !== 'receita' ? <Package className="h-4 w-4 shrink-0 text-blue-600" /> : <ChefHat className="h-4 w-4 shrink-0 text-orange-600" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.nome}</p><p className="text-xs text-muted-foreground">Retirada: {item.quantidade} · {formatBRL(item.quantidade * item.custoUnitario)}</p></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removerItem(item.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{localizeText("Cada item será salvo separadamente no histórico.")}</p>
          </div>


        <div className="grid gap-3 sm:grid-cols-2">
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

      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Adicionar {tipo !== 'receita' ? 'produto' : 'receita'}</DialogTitle>
          </DialogHeader>
          {tipo !== 'receita' && produtoSel ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                {produtoSel.imagem_url
                  ? <img src={produtoSel.imagem_url} alt={produtoSel.nome} className="h-16 w-16 rounded-xl object-cover" />
                  : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600"><Package className="h-7 w-7" /></span>}
                <div className="min-w-0"><p className="truncate font-semibold">{produtoSel.nome}</p><p className="text-sm text-muted-foreground">Disponível: {produtoSel.estoque_atual} {produtoSel.unidade_compra}</p><p className="text-sm text-muted-foreground">Custo unitário: {produtoSel.custo_indisponivel ? 'Indisponível: ajuste o rendimento' : formatBRL(produtoSel.custo_unitario)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Quantidade retirada</Label><NumericInputPtBr tipo="quantidade_continua" value={quantidade} onChange={setQuantidade} /></div>
                <div className="space-y-2"><Label>Custo da perda</Label><Input value={formatBRL(custoTotal)} disabled className="bg-muted/40 font-semibold" /></div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setItemModalOpen(false)}>Cancelar</Button><Button type="button" onClick={adicionarItem} disabled={!podeAdicionar} className="gap-2"><Plus className="h-4 w-4" /> Adicionar</Button></DialogFooter>
            </div>
          ) : tipo === 'receita' && receitaSel ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                {receitaSel.imagem_url
                  ? <img src={receitaSel.imagem_url} alt={receitaSel.nome} className="h-16 w-16 rounded-xl object-cover" />
                  : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><ChefHat className="h-7 w-7" /></span>}
                <div className="min-w-0"><p className="truncate font-semibold">#{receitaSel.numero_sequencial} {receitaSel.nome}</p><p className="text-sm text-muted-foreground">Rendimento: {receitaSel.rendimento_valor || 1} {receitaSel.rendimento_unidade || 'un'}</p><p className="text-sm text-muted-foreground">Custo da produção: {formatBRL(receitaSel.custo_total)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Quantidade retirada</Label><NumericInputPtBr tipo="quantidade_continua" value={quantidade} onChange={setQuantidade} /></div>
                <div className="space-y-2"><Label>Custo da perda</Label><Input value={formatBRL(custoTotal)} disabled className="bg-muted/40 font-semibold" /></div>
              </div>
              <p className="text-xs text-muted-foreground">Informe a quantidade na unidade de rendimento da receita.</p>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setItemModalOpen(false)}>Cancelar</Button><Button type="button" onClick={adicionarItem} disabled={!podeAdicionar} className="gap-2"><Plus className="h-4 w-4" /> Adicionar</Button></DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmacaoOpen} onOpenChange={(value) => !saving && setConfirmacaoOpen(value)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{localizeText("Deseja dar baixa no estoque?")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {itens.length === 1 ? 'A perda selecionada será registrada' : `As ${itens.length} perdas selecionadas serão registradas`} de qualquer forma, cada uma separadamente no histórico.
              </span>
              <span className="block">
                {tipo === 'geladeira' ? 'Ao dar baixa, a quantidade será descontada do saldo da Geladeira e aparecerá no Histórico Geral.' : tipo === 'produto'
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
