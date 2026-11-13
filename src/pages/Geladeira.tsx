import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Pencil, Plus, Refrigerator, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchReceitaParaVisualizacao, fetchTodasReceitas } from '@/lib/receitasData';
import { custoUnitarioGeladeira, fetchGeladeira, receitaPodeEntrar, type GeladeiraItem } from '@/lib/geladeiraData';
import { ReceitaPreviewModal } from '@/components/receitas/ReceitaPreviewModal';
import { formatMoney } from '@/lib/business-region';
import { formatters } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const qty = (value: number) => formatters.quantidadeContinua(value);
const money = (value: number | null) => value === null ? 'Indisponível' : formatMoney(value);
const unitMoney = (value: number | null) => value === null ? 'Indisponível' : formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
type Modal = { tipo: 'cadastro' | 'edicao' | 'remocao'; item?: GeladeiraItem };

export default function Geladeira() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [saldo, setSaldo] = useState('todos');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [previewItem, setPreviewItem] = useState<GeladeiraItem | null>(null);
  const [receitaId, setReceitaId] = useState('');
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [quantidadeAtual, setQuantidadeAtual] = useState(0);
  const [minimo, setMinimo] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saldoDesatualizado, setSaldoDesatualizado] = useState(false);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const savingRef = useRef(false);
  const itemsQuery = useQuery({ queryKey: ['geladeira', user?.id], enabled: !!user,
    queryFn: ({ signal }) => fetchGeladeira(user!.id, signal), staleTime: 0 });
  const recipesQuery = useQuery({ queryKey: ['geladeira-receitas', user?.id], enabled: !!user && !!modal && !modal.item,
    queryFn: () => fetchTodasReceitas(user!.id, { status: 'finalizada' }), staleTime: 0 });
  const previewQuery = useQuery({ queryKey: ['geladeira-receita-detalhes', user?.id, previewItem?.receita_id], enabled: !!user && !!previewItem,
    queryFn: ({ signal }) => fetchReceitaParaVisualizacao(user!.id, previewItem!.receita_id, signal), staleTime: 0 });
  const items = useMemo(() => itemsQuery.data || [], [itemsQuery.data]);
  const filtered = useMemo(() => items.filter(item => {
    const sub = item.receita.markup?.tipo === 'sub_receita';
    return `${item.receita.nome} ${item.receita.numero_sequencial}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      && (tipo === 'todos' || (tipo === 'sub' ? sub : !sub))
      && (saldo === 'todos' || (saldo === 'baixo' ? item.estoque_atual < item.estoque_minimo : item.estoque_atual > 0));
  }), [items, search, tipo, saldo]);
  const lastPage = Math.max(0, Math.ceil(filtered.length / 24) - 1);
  const currentPage = Math.min(page, lastPage);
  const visible = filtered.slice(currentPage * 24, currentPage * 24 + 24);
  const total = filtered.reduce((sum, item) => sum + (custoUnitarioGeladeira(item.receita) ?? 0) * item.estoque_atual, 0);
  const hasUnknownCost = filtered.some(item => item.estoque_atual > 0 && custoUnitarioGeladeira(item.receita) === null);
  const selected = modal?.item?.receita || recipesQuery.data?.find(r => r.id === receitaId);
  const selectedCost = selected ? custoUnitarioGeladeira(selected) : null;
  const selectedUnit = modal?.item?.unidade || selected?.rendimento_unidade || '';
  const quantidadeModal = modal?.tipo === 'edicao' ? quantidadeAtual : saldoInicial;
  const pickerRecipes = (recipesQuery.data || []).filter(r => !items.some(item => item.receita_id === r.id));

  function openModal(tipo: Modal['tipo'], item?: GeladeiraItem) {
    setModal({ tipo, item }); setReceitaId(item?.receita_id || '');
    setSaldoInicial(0);
    setQuantidadeAtual(item?.estoque_atual ?? 0);
    setMinimo(item?.estoque_minimo || 0);
    setObservacao(''); setSaveError(''); setSaldoDesatualizado(false); pending.current = null;
  }
  function closeModal() { if (!savingRef.current) setModal(null); }
  function selectRecipe(id: string) {
    setReceitaId(id);
    setSaldoInicial(0);
    setMinimo(0);
    setSaveError('');
    pending.current = null;
  }
  async function recarregarSaldo() {
    const result = await itemsQuery.refetch();
    if (result.error) { setSaveError('Não foi possível atualizar o saldo. Tente novamente.'); return; }
    const item = result.data?.find(item => item.id === modal?.item?.id);
    if (!item) { setSaveError('Este item já foi removido da Geladeira.'); return; }
    openModal('edicao', item);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!modal || !user || !selected || savingRef.current || saldoDesatualizado) return;
    if (modal.tipo === 'cadastro' && !receitaPodeEntrar(selected)) { setSaveError('Informe o rendimento e a unidade na receita antes de adicionar.'); return; }
    const ajustandoSaldo = modal.tipo === 'edicao' && quantidadeAtual !== modal.item?.estoque_atual;
    const args = { p_receita_id: selected.id, p_tipo: modal.tipo === 'edicao' ? (ajustandoSaldo ? 'ajuste' : 'minimo') : modal.tipo,
      p_quantidade: modal.tipo === 'cadastro' ? saldoInicial : ajustandoSaldo ? quantidadeAtual : 0,
      p_estoque_minimo: modal.tipo === 'edicao' || !modal.item ? minimo : null, p_observacao: observacao || null,
      p_saldo_esperado: ajustandoSaldo ? modal.item!.estoque_atual : null };
    const signature = JSON.stringify(args);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    savingRef.current = true; setSaving(true); setSaveError('');
    try {
      const { error } = modal.tipo === 'cadastro'
        ? saldoInicial > 0
          ? await supabase.rpc('cadastrar_item_geladeira_com_saldo', { p_receita_id: selected.id, p_saldo_inicial: saldoInicial, p_estoque_minimo: minimo, p_request_id: pending.current.id })
          : await supabase.rpc('cadastrar_item_geladeira', { p_receita_id: selected.id, p_estoque_minimo: minimo })
        : modal.tipo === 'remocao'
          ? await supabase.rpc('remover_item_da_geladeira', { p_receita_id: selected.id, p_request_id: pending.current.id })
          : await supabase.rpc('movimentar_geladeira', { ...args, p_request_id: pending.current.id });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['geladeira', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['geladeira-historico', user.id] }),
      ]);
      toast.success(modal.tipo === 'remocao' ? 'Receita removida da Geladeira. Histórico preservado.' : 'Geladeira atualizada.');
      setModal(null); pending.current = null;
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Não foi possível salvar. Tente novamente.';
      setSaveError(message);
      setSaldoDesatualizado(!!error && typeof error === 'object' && 'code' in error && error.code === '40001');
    } finally { savingRef.current = false; setSaving(false); }
  }
  const actions = (item: GeladeiraItem) => <div className="flex items-center justify-end gap-1">
    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Editar ${item.receita.nome} na Geladeira`} title="Editar item da Geladeira" onClick={() => openModal('edicao', item)}><Pencil className="h-4 w-4" /></Button>
    <Button variant="ghost" size="icon" className="h-11 w-11 text-destructive hover:text-destructive" aria-label={`Remover ${item.receita.nome} da Geladeira`} title="Remover da Geladeira" onClick={() => openModal('remocao', item)}><Trash2 className="h-4 w-4" /></Button>
  </div>;
  const recipeButton = (item: GeladeiraItem) => <button type="button" onClick={() => setPreviewItem(item)} aria-label={`Ver informações de ${item.receita.nome}`}
    className="flex min-w-0 items-center gap-3 rounded-lg text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
    {item.receita.imagem_url ? <img src={item.receita.imagem_url} alt={item.receita.nome} loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-5 w-5" /></span>}
    <span className="min-w-0"><span className="block whitespace-normal break-words font-semibold">{item.receita.nome}</span><span className="mt-1 block text-xs text-muted-foreground">#{item.receita.numero_sequencial}</span></span>
  </button>;
  return <div className="min-w-0 space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-sm text-muted-foreground">Receitas prontas e sub-receitas armazenadas, com custo atualizado pela ficha técnica.</p>
      <div className="flex shrink-0 gap-2">
        <Button className="min-h-11 flex-1" disabled={itemsQuery.isPending || itemsQuery.isError} onClick={() => openModal('cadastro')}><Plus className="mr-2 h-4 w-4" />Adicionar receita</Button></div>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar na Geladeira" placeholder="Buscar por receita ou código..." className="h-11 pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <Select value={tipo} onValueChange={v => { setTipo(v); setPage(0); }}><SelectTrigger aria-label="Tipo de receita" className="h-11 sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem><SelectItem value="final">Receitas finais</SelectItem><SelectItem value="sub">Sub-receitas</SelectItem></SelectContent></Select>
      <Select value={saldo} onValueChange={v => { setSaldo(v); setPage(0); }}><SelectTrigger aria-label="Filtrar saldo" className="h-11 sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os saldos</SelectItem><SelectItem value="disponivel">Com saldo</SelectItem><SelectItem value="baixo">Abaixo do mínimo</SelectItem></SelectContent></Select>
    </div>
    {itemsQuery.isPending ? <p role="status" className="py-12 text-center text-muted-foreground">Carregando Geladeira…</p> : itemsQuery.isError ? <div role="alert" className="space-y-3 py-10 text-center"><p>Não foi possível carregar a Geladeira.</p><Button variant="outline" onClick={() => void itemsQuery.refetch()}>Tentar novamente</Button></div> : !filtered.length ?
      <div className="rounded-xl border border-dashed px-5 py-14 text-center"><Refrigerator className="mx-auto mb-4 h-9 w-9 text-muted-foreground" /><p className="font-semibold">{items.length ? 'Nenhuma receita encontrada' : 'Sua Geladeira está vazia'}</p><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Ajuste a busca ou os filtros.' : 'Adicione uma receita final ou sub-receita e registre as entradas em Movimentações.'}</p>{!items.length && <Button className="mt-5" onClick={() => openModal('cadastro')}>Adicionar receita</Button>}</div> : <>
      <div className="hidden overflow-hidden rounded-xl border bg-card lg:block"><Table><TableHeader><TableRow><TableHead>Receita</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Mínimo</TableHead><TableHead className="text-right">Custo por unidade</TableHead><TableHead className="text-right">Custo armazenado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map(item => { const cost = custoUnitarioGeladeira(item.receita); return <TableRow key={item.id}>
          <TableCell className="min-w-[220px] max-w-[380px]">{recipeButton(item)}</TableCell>
          <TableCell><Badge variant="secondary" className="whitespace-nowrap">{item.receita.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}</Badge></TableCell>
          <TableCell className={`whitespace-nowrap text-right font-medium tabular-nums ${item.estoque_atual < item.estoque_minimo ? 'text-amber-700 dark:text-amber-400' : ''}`}>{qty(item.estoque_atual)} {item.unidade}{item.estoque_atual < item.estoque_minimo && <span className="block text-xs font-normal">Abaixo do mínimo</span>}</TableCell>
          <TableCell className="text-right tabular-nums">{qty(item.estoque_minimo)} {item.unidade}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{unitMoney(cost)} / {item.unidade}</TableCell><TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{money(cost === null ? null : cost * item.estoque_atual)}</TableCell><TableCell>{actions(item)}</TableCell>
        </TableRow>; })}</TableBody></Table></div>
      <div className="divide-y rounded-xl border bg-card lg:hidden">{visible.map(item => { const cost = custoUnitarioGeladeira(item.receita); return <div key={item.id} className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0">{recipeButton(item)}<p className="mt-2 text-xs text-muted-foreground">{item.receita.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}</p></div>{actions(item)}</div>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Quantidade</dt><dd className="mt-1 font-semibold">{qty(item.estoque_atual)} {item.unidade}</dd></div><div className="text-right"><dt className="text-xs text-muted-foreground">Custo armazenado</dt><dd className="mt-1 font-semibold">{money(cost === null ? null : cost * item.estoque_atual)}</dd></div><div><dt className="text-xs text-muted-foreground">Mínimo</dt><dd>{qty(item.estoque_minimo)} {item.unidade}</dd></div><div className="text-right"><dt className="text-xs text-muted-foreground">Custo por {item.unidade}</dt><dd>{unitMoney(cost)}</dd></div></dl>
        {item.estoque_atual < item.estoque_minimo && <p className="text-xs text-amber-700 dark:text-amber-400">Abaixo do mínimo</p>}
      </div>; })}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{filtered.length} receita{filtered.length === 1 ? '' : 's'}</span><p>{hasUnknownCost ? 'Total parcial' : 'Custo total armazenado'}: <strong className="tabular-nums">{money(total)}</strong></p></div>
      {hasUnknownCost && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Há receitas sem rendimento válido. Corrija a ficha técnica para calcular todo o custo armazenado.</p>}
      {lastPage > 0 && <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-sm">{currentPage + 1} de {lastPage + 1}</span><Button variant="outline" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>}
    </>}
    <Dialog open={!!modal} onOpenChange={open => { if (!open) closeModal(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] sm:p-0">
        <DialogHeader className="shrink-0 px-5 pb-4 pt-6 text-left sm:px-6">
          <DialogTitle className="pr-9 leading-snug">{modal?.tipo === 'remocao' ? 'Remover da Geladeira' : modal?.item ? 'Editar item da Geladeira' : 'Adicionar receita à Geladeira'}</DialogTitle>
          <DialogDescription>{modal?.item ? modal.item.receita.nome : 'Escolha a receita para carregar os dados e o custo.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
            <fieldset disabled={saving} className="min-w-0 space-y-5">
              {!modal?.item && <div className="space-y-2">
                <Label htmlFor="geladeira-receita">Receita</Label>
                <Select value={receitaId} onValueChange={selectRecipe} disabled={recipesQuery.isPending || recipesQuery.isError || !pickerRecipes.length}>
                  <SelectTrigger id="geladeira-receita" aria-label="Selecionar receita">
                    <SelectValue placeholder={recipesQuery.isPending ? 'Carregando receitas…' : 'Selecione uma receita'}>{selected?.nome}</SelectValue>
                  </SelectTrigger>
                  <SelectContent searchable searchPlaceholder="Buscar por nome, código ou categoria…" searchLabel="Buscar receita"
                    className="max-h-[min(300px,var(--radix-select-content-available-height,300px))]"
                    viewportClassName="max-h-52" collisionPadding={16}>
                    {pickerRecipes.map(r => <SelectItem key={r.id} value={r.id} disabled={!receitaPodeEntrar(r)} textValue={`${r.nome} ${r.numero_sequencial} ${r.tipo_produto?.nome?.trim() || 'Sem categoria'} ${r.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}`}>
                      <span className="flex min-w-0 items-center gap-3">
                        {r.imagem_url ? <img src={r.imagem_url} alt="" loading="lazy" decoding="async" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-5 w-5" /></span>}
                        <span className="min-w-0 whitespace-normal">
                          <span className="block break-words font-medium leading-snug">{r.nome}</span>
                          <span className="mt-0.5 block break-words text-xs font-medium text-primary">Categoria: {r.tipo_produto?.nome?.trim() || 'Sem categoria'}</span>
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">#{r.numero_sequencial} · {r.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}{!receitaPodeEntrar(r) ? ' · Ajuste o rendimento na receita' : ''}</span>
                        </span>
                      </span>
                    </SelectItem>)}
                  </SelectContent>
                </Select>
                {recipesQuery.isError && <div role="alert" className="space-y-2 text-sm"><p>Erro ao carregar receitas.</p><Button type="button" variant="outline" onClick={() => void recipesQuery.refetch()}>Tentar novamente</Button></div>}
                {recipesQuery.isSuccess && !pickerRecipes.length && <p className="text-sm text-muted-foreground">Nenhuma receita disponível. Receitas já adicionadas recebem novas entradas em Movimentações.</p>}
              </div>}
              {selected && modal?.tipo !== 'remocao' && <section aria-label="Dados da receita selecionada" aria-live="polite" className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-3 p-4">
                  {selected.imagem_url ? <img key={selected.id} src={selected.imagem_url} alt={selected.nome} className="h-14 w-14 shrink-0 rounded-lg object-cover" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ChefHat aria-hidden="true" className="h-6 w-6" /></div>}
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold leading-snug">{selected.nome}</h3>
                    <p className="mt-1 break-words text-xs font-medium text-primary">Categoria: {selected.tipo_produto?.nome?.trim() || 'Sem categoria'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">#{selected.numero_sequencial} · {selected.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 pb-4 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Unidade do estoque</dt><dd className="mt-1 font-medium">{selectedUnit}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Rendimento da receita</dt><dd className="mt-1 font-medium">{selected.rendimento_valor === null ? 'Indisponível' : qty(selected.rendimento_valor)} {selected.rendimento_unidade}</dd></div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-primary/5 px-4 py-3">
                  <div><p className="text-sm font-medium">Custo por {selectedUnit}</p><p className="mt-0.5 text-xs text-muted-foreground">Atualizado pela ficha técnica</p></div>
                  <strong className="text-lg tabular-nums text-primary">{unitMoney(selectedCost)}</strong>
                </div>
              </section>}
              {selected && modal && (modal.tipo === 'edicao' || !modal.item) && <div className="grid gap-4 sm:grid-cols-2">
                {modal.tipo === 'cadastro' ? <div className="space-y-2">
                  <Label htmlFor="geladeira-saldo-inicial">Saldo inicial ({selectedUnit})</Label>
                  <NumericInputPtBr id="geladeira-saldo-inicial" tipo="quantidade_continua" value={saldoInicial} onChange={setSaldoInicial} min={0} placeholder="" />
                </div> : <div className="space-y-2">
                  <Label htmlFor="geladeira-quantidade-atual">Quantidade atual ({selectedUnit})</Label>
                  <NumericInputPtBr key={`${modal.item?.id}:${modal.item?.updated_at}:${modal.item?.estoque_atual}`} id="geladeira-quantidade-atual" tipo="quantidade_continua" value={quantidadeAtual} onChange={setQuantidadeAtual} min={0} placeholder="" />
                </div>}
                <div className="space-y-2">
                  <Label htmlFor="geladeira-minimo">Estoque mínimo ({selectedUnit})</Label>
                  <NumericInputPtBr id="geladeira-minimo" tipo="quantidade_continua" value={minimo} onChange={setMinimo} min={0} placeholder="" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="geladeira-valor-total">Valor total em estoque</Label>
                  <Input id="geladeira-valor-total" readOnly value={modal.tipo === 'edicao' || quantidadeModal > 0 ? money(selectedCost === null ? null : quantidadeModal * selectedCost) : ''} className="bg-primary/5 font-semibold tabular-nums text-primary" />
                </div>
              </div>}
              {modal?.tipo === 'remocao' ? <div className="space-y-3 text-sm"><p>Este item será removido somente da lista da Geladeira. <strong>A receita cadastrada não será apagada</strong>, e o histórico será preservado.</p>{!!modal.item?.estoque_atual && <p className="text-muted-foreground">O saldo de <strong>{qty(modal.item.estoque_atual)} {selectedUnit}</strong> deixará de aparecer na Geladeira.</p>}</div> : modal?.tipo === 'edicao' ? <div className="space-y-2"><Label htmlFor="geladeira-obs">Observação (opcional)</Label><Input id="geladeira-obs" maxLength={500} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação sobre a alteração" /></div> : null}
            </fieldset>
            {saveError && <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p>}
            {saldoDesatualizado && <Button type="button" variant="outline" className="mt-3" disabled={itemsQuery.isFetching} onClick={() => void recarregarSaldo()}>{itemsQuery.isFetching ? 'Atualizando saldo…' : 'Recarregar saldo'}</Button>}
          </div>
          <DialogFooter className="shrink-0 flex-row gap-2 border-t px-5 py-4 sm:space-x-0 sm:px-6">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" disabled={saving} onClick={closeModal}>Cancelar</Button>
            <Button type="submit" className="flex-1 sm:flex-none" disabled={saving || !selected || saldoDesatualizado} variant={modal?.tipo === 'remocao' ? 'destructive' : 'default'}>{saving ? 'Salvando…' : modal?.tipo === 'remocao' ? 'Remover' : modal?.tipo === 'cadastro' ? 'Adicionar à Geladeira' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ReceitaPreviewModal receita={previewQuery.data || null} open={!!previewItem && !!previewQuery.data} onOpenChange={open => { if (!open) setPreviewItem(null); }} />
    <Dialog open={!!previewItem && !previewQuery.data} onOpenChange={open => { if (!open) setPreviewItem(null); }}>
      <DialogContent><DialogHeader><DialogTitle className="pr-8 break-words">{previewItem?.receita.nome}</DialogTitle><DialogDescription>Informações da receita</DialogDescription></DialogHeader>
        {previewQuery.isError ? <div role="alert" className="space-y-3"><p>Não foi possível carregar a receita.</p><Button onClick={() => void previewQuery.refetch()}>Tentar novamente</Button></div> : <p role="status">Carregando receita…</p>}
      </DialogContent>
    </Dialog>
  </div>;
}
