import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, Refrigerator, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchTodasReceitas } from '@/lib/receitasData';
import { custoUnitarioGeladeira, fetchGeladeira, OPERACAO_LABEL, receitaPodeEntrar, type GeladeiraItem } from '@/lib/geladeiraData';
import { formatMoney } from '@/lib/business-region';
import { formatters } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const qty = (value: number) => formatters.quantidadeContinua(value);
const money = (value: number | null) => value === null ? 'Indisponível' : formatMoney(value);
const unitMoney = (value: number | null) => value === null ? 'Indisponível' : formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
type Modal = { tipo: 'cadastro' | 'minimo' | 'remocao'; item?: GeladeiraItem };

export default function Geladeira() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [saldo, setSaldo] = useState('todos');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [receitaId, setReceitaId] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [minimo, setMinimo] = useState(0);
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const savingRef = useRef(false);
  const itemsQuery = useQuery({ queryKey: ['geladeira', user?.id], enabled: !!user,
    queryFn: ({ signal }) => fetchGeladeira(user!.id, signal), staleTime: 0 });
  const recipesQuery = useQuery({ queryKey: ['geladeira-receitas', user?.id], enabled: !!user && !!modal && !modal.item,
    queryFn: () => fetchTodasReceitas(user!.id, { status: 'finalizada' }), staleTime: 0 });
  const items = itemsQuery.data || [];
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
  const pickerRecipes = (recipesQuery.data || []).filter(r => !items.some(item => item.receita_id === r.id)
    && `${r.nome} ${r.numero_sequencial}`.toLocaleLowerCase().includes(recipeSearch.toLocaleLowerCase()));

  function openModal(tipo: Modal['tipo'], item?: GeladeiraItem) {
    setModal({ tipo, item }); setReceitaId(item?.receita_id || ''); setRecipeSearch('');
    setMinimo(item?.estoque_minimo || 0);
    setObservacao(''); setSaveError(''); pending.current = null;
  }
  function closeModal() { if (!savingRef.current) setModal(null); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!modal || !user || !selected || savingRef.current) return;
    if (modal.tipo === 'cadastro' && !receitaPodeEntrar(selected)) { setSaveError('Informe o rendimento e a unidade na receita antes de adicionar.'); return; }
    const args = { p_receita_id: selected.id, p_tipo: modal.tipo, p_quantidade: 0,
      p_estoque_minimo: modal.tipo === 'minimo' || !modal.item ? minimo : null, p_observacao: observacao || null };
    const signature = JSON.stringify(args);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    savingRef.current = true; setSaving(true); setSaveError('');
    try {
      const { error } = modal.tipo === 'cadastro'
        ? await supabase.rpc('cadastrar_item_geladeira', { p_receita_id: selected.id, p_estoque_minimo: minimo })
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
    } finally { savingRef.current = false; setSaving(false); }
  }
  const actions = (item: GeladeiraItem) => <div className="flex items-center justify-end gap-1">
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Mais opções para ${item.receita.nome}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openModal('minimo', item)}>Editar estoque mínimo</DropdownMenuItem>
        <DropdownMenuItem asChild><Link to={`/receitas/${item.receita_id}/editar`}>Abrir receita</Link></DropdownMenuItem>
        <DropdownMenuItem disabled={item.estoque_atual !== 0} className="text-destructive" onClick={() => openModal('remocao', item)}>Remover da Geladeira</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
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
          <TableCell><Link className="font-medium hover:text-primary" to={`/receitas/${item.receita_id}/editar`}>{item.receita.nome}</Link><span className="mt-1 block text-xs text-muted-foreground">#{item.receita.numero_sequencial}</span></TableCell>
          <TableCell><Badge variant="secondary" className="whitespace-nowrap">{item.receita.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}</Badge></TableCell>
          <TableCell className={`whitespace-nowrap text-right font-medium tabular-nums ${item.estoque_atual < item.estoque_minimo ? 'text-amber-700 dark:text-amber-400' : ''}`}>{qty(item.estoque_atual)} {item.unidade}{item.estoque_atual < item.estoque_minimo && <span className="block text-xs font-normal">Abaixo do mínimo</span>}</TableCell>
          <TableCell className="text-right tabular-nums">{qty(item.estoque_minimo)} {item.unidade}</TableCell><TableCell className="whitespace-nowrap text-right tabular-nums">{unitMoney(cost)} / {item.unidade}</TableCell><TableCell className="whitespace-nowrap text-right font-medium tabular-nums">{money(cost === null ? null : cost * item.estoque_atual)}</TableCell><TableCell>{actions(item)}</TableCell>
        </TableRow>; })}</TableBody></Table></div>
      <div className="divide-y rounded-xl border bg-card lg:hidden">{visible.map(item => { const cost = custoUnitarioGeladeira(item.receita); return <div key={item.id} className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link to={`/receitas/${item.receita_id}/editar`} className="break-words font-semibold">{item.receita.nome}</Link><p className="mt-1 text-xs text-muted-foreground">#{item.receita.numero_sequencial} · {item.receita.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}</p></div>{actions(item)}</div>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Quantidade</dt><dd className="mt-1 font-semibold">{qty(item.estoque_atual)} {item.unidade}</dd></div><div className="text-right"><dt className="text-xs text-muted-foreground">Custo armazenado</dt><dd className="mt-1 font-semibold">{money(cost === null ? null : cost * item.estoque_atual)}</dd></div><div><dt className="text-xs text-muted-foreground">Mínimo</dt><dd>{qty(item.estoque_minimo)} {item.unidade}</dd></div><div className="text-right"><dt className="text-xs text-muted-foreground">Custo por {item.unidade}</dt><dd>{unitMoney(cost)}</dd></div></dl>
        {item.estoque_atual < item.estoque_minimo && <p className="text-xs text-amber-700 dark:text-amber-400">Abaixo do mínimo</p>}
      </div>; })}</div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{filtered.length} receita{filtered.length === 1 ? '' : 's'}</span><p>{hasUnknownCost ? 'Total parcial' : 'Custo total armazenado'}: <strong className="tabular-nums">{money(total)}</strong></p></div>
      {hasUnknownCost && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">Há receitas sem rendimento válido. Corrija a ficha técnica para calcular todo o custo armazenado.</p>}
      {lastPage > 0 && <div className="flex items-center justify-center gap-3"><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-sm">{currentPage + 1} de {lastPage + 1}</span><Button variant="outline" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>}
    </>}
    <Dialog open={!!modal} onOpenChange={open => { if (!open) closeModal(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{modal?.item ? `${modal.tipo === 'cadastro' ? 'Cadastro' : OPERACAO_LABEL[modal.tipo]} · Geladeira` : 'Adicionar receita à Geladeira'}</DialogTitle><DialogDescription>{modal?.item ? modal.item.receita.nome : 'Selecione uma receita final ou sub-receita já cadastrada.'}</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="min-w-0 space-y-4">
        {!modal?.item && <div className="space-y-2"><Label htmlFor="geladeira-receita-busca">Receita</Label><Input id="geladeira-receita-busca" placeholder="Buscar receita..." value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} />
          {recipesQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">Carregando receitas…</p> : recipesQuery.isError ? <div role="alert"><p>Erro ao carregar receitas.</p><Button type="button" variant="outline" onClick={() => void recipesQuery.refetch()}>Tentar novamente</Button></div> :
            <Select value={receitaId} onValueChange={setReceitaId}><SelectTrigger aria-label="Selecionar receita"><SelectValue placeholder="Selecione uma receita" /></SelectTrigger><SelectContent searchable={false}>{selected && !pickerRecipes.some(r => r.id === selected.id) && <SelectItem value={selected.id}>{selected.nome}</SelectItem>}{pickerRecipes.map(r => <SelectItem key={r.id} value={r.id} disabled={!receitaPodeEntrar(r)}>{r.nome} · {r.markup?.tipo === 'sub_receita' ? 'Sub-receita' : 'Receita final'}{!receitaPodeEntrar(r) ? ' (ajuste o rendimento)' : ''}</SelectItem>)}</SelectContent></Select>}
          {recipesQuery.isSuccess && !pickerRecipes.length && <p className="text-sm text-muted-foreground">Nenhuma receita disponível para esta busca. Receitas já adicionadas recebem novas entradas em Movimentações.</p>}
          <p className="text-xs text-muted-foreground">A receita precisa ter rendimento e unidade preenchidos. As entradas e saídas são registradas em Movimentações.</p>
        </div>}
        {selected && modal?.tipo !== 'remocao' && <div className="rounded-lg bg-muted/50 p-3 text-sm"><div className="flex justify-between gap-3"><span>Custo por {selectedUnit}</span><strong>{unitMoney(selectedCost)}</strong></div><p className="mt-1 text-xs text-muted-foreground">Calculado automaticamente pela receita, sem aplicar o markup de venda.</p>{modal?.item && <p className="mt-2">Saldo atual: <strong>{qty(modal.item.estoque_atual)} {selectedUnit}</strong></p>}</div>}
        {modal && (modal.tipo === 'minimo' || !modal.item) && <div className="space-y-2"><Label htmlFor="geladeira-minimo">Estoque mínimo{selectedUnit ? ` (${selectedUnit})` : ''}</Label><NumericInputPtBr id="geladeira-minimo" tipo="quantidade_continua" value={minimo} onChange={setMinimo} min={0} placeholder="0" /></div>}
        {modal?.tipo === 'remocao' ? <p className="text-sm">Remover esta receita da lista da Geladeira? A ficha técnica e o histórico serão preservados.</p> : modal?.tipo === 'minimo' ? <div className="space-y-2"><Label htmlFor="geladeira-obs">Observação (opcional)</Label><Input id="geladeira-obs" maxLength={500} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação sobre o estoque mínimo" /></div> : null}
      </fieldset>{saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}<DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={closeModal}>Cancelar</Button><Button type="submit" disabled={saving || !selected} variant={modal?.tipo === 'remocao' ? 'destructive' : 'default'}>{saving ? 'Salvando…' : modal?.tipo === 'remocao' ? 'Remover' : 'Salvar'}</Button></DialogFooter></form>
    </DialogContent></Dialog>
  </div>;
}
