import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tiposProdutoKey } from '@/lib/tiposProdutoData';
import { fetchReceitasPage, fetchTodasReceitas, RECEITAS_PAGE_SIZE } from '@/lib/receitasData';
import type { Json } from '@/integrations/supabase/types';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Loader2, Download } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import { useExportReceitas } from '@/hooks/useExportReceitas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ReceitaCard } from './ReceitaCard';
import { ExportMarkupModal } from './ExportMarkupModal';
import { useTranslation } from 'react-i18next';
import type { ReceitaComDados } from '@/types/receitas';
import { usePlanGate } from '@/contexts/PlanLimitContext';

export function ListaReceitas() {
  usePortugalTranslation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchTiposProduto } = useReceitas();
  const queryClient = useQueryClient();
  const { exportarReceitas, exporting } = useExportReceitas();
  const { user } = useAuth();
  const { requestAccess } = usePlanGate();
  const [checkingPlan, setCheckingPlan] = useState(false);
  const handleNewRecipe = async () => {
    if (checkingPlan) return;
    setCheckingPlan(true);
    try {
      if (await requestAccess('receitas')) navigate(`/receitas/nova${location.search}`);
    } finally { setCheckingPlan(false); }
  };
  const userId = user?.id;
  const listStartRef = useRef<HTMLDivElement>(null);

  const search = searchParams.get('busca') || '';
  const tipoFilter = searchParams.get('tipo') || 'all';
  const subReceitaFilter = searchParams.get('subReceita') || 'all';
  const setFilter = (name: string, value: string) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('pagina');
      if (!value || (name !== 'busca' && value === 'all')) next.delete(name);
      else next.set(name, value);
      return next;
    }, { replace: true });
  };
  const requestedPage = Number(searchParams.get('pagina'));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  const [showExportModal, setShowExportModal] = useState(false);
  const [preparingExport, setPreparingExport] = useState(false);
  const [markupsDisponiveis, setMarkupsDisponiveis] = useState<Array<{ id: string; nome: string }>>([]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = { search: debouncedSearch, tipo: tipoFilter, subReceita: subReceitaFilter };
  const receitasQuery = useQuery({
    queryKey: ['receitas-lista', user?.id, filters, page],
    queryFn: ({ signal }) => fetchReceitasPage(user!.id, filters, page, RECEITAS_PAGE_SIZE, signal),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === user?.id ? previous : undefined,
  });
  const receitas = receitasQuery.data?.receitas || [];
  const total = receitasQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / RECEITAS_PAGE_SIZE));
  const loading = receitasQuery.isPending;
  const exportBusy = exporting || preparingExport;
  const setPage = (value: number) => {
    listStartRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value <= 1) next.delete('pagina');
      else next.set('pagina', String(value));
      return next;
    }, { replace: true });
  };
  useEffect(() => {
    if (!receitasQuery.isPlaceholderData && receitasQuery.data && page > totalPages) {
      setSearchParams(previous => {
        const next = new URLSearchParams(previous);
        if (totalPages === 1) next.delete('pagina');
        else next.set('pagina', String(totalPages));
        return next;
      }, { replace: true });
    }
  }, [receitasQuery.data, receitasQuery.isPlaceholderData, page, totalPages, setSearchParams]);

  const tiposQuery = useQuery({
    queryKey: tiposProdutoKey(user?.id),
    queryFn: ({ signal }) => fetchTiposProduto(signal),
    enabled: !!user,
    staleTime: 60_000,
  });
  const tiposProduto = tiposQuery.data || [];
  const { data: markupConfigsMap = {}, isPending: loadingConfigs } = useQuery({
    queryKey: ['receitas-markup-configs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_configurations')
        .select('type, configuration').eq('user_id', user!.id).ilike('type', 'markup_%');
      if (error) throw error;
      return Object.fromEntries((data || []).map(item => [item.type, item.configuration])) as Record<string, Json>;
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const loadReceitas = () => queryClient.invalidateQueries({ queryKey: ['receitas-lista', user?.id] });

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`lista-receitas-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receitas', filter: `user_id=eq.${userId}` }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          void queryClient.invalidateQueries({ queryKey: ['receitas-lista', userId] });
        }, 500);
      }).subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const loadMarkups = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('markups')
      .select('id, nome')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .neq('tipo', 'sub_receita')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar markups:', error);
      return;
    }

    setMarkupsDisponiveis(data || []);
  };

  const handleExportClick = async () => {
    await loadMarkups();
    setShowExportModal(true);
  };

  const handleExportConfirm = async (markupId: string | null, markupNome: string | null) => {
    setShowExportModal(false);
    if (!user) return;
    setPreparingExport(true);
    try {
      const todasReceitas = await fetchTodasReceitas(user.id, filters);
      await exportarReceitas(todasReceitas, markupId, markupNome);
    } catch {
      toast.error('Não foi possível carregar todas as receitas para exportar. Tente novamente.');
    } finally {
      setPreparingExport(false);
    }
  };

  const handleEdit = (receita: ReceitaComDados) => {
    navigate(`/receitas/${receita.id}/editar${location.search}`);
  };

  return (
    <>
      <Card ref={listStartRef} className="scroll-mt-20">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{t('receitas.recipes')}</CardTitle>
            <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto">
              <Button 
                onClick={handleExportClick}
                variant="outline"
                className="flex-1 sm:flex-initial"
                disabled={total === 0 || exportBusy || receitasQuery.isFetching}
              >
                {exportBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('receitas.exporting')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {t('receitas.exportExcel')}
                  </>
                )}
              </Button>
              <Button onClick={handleNewRecipe} disabled={checkingPlan} aria-busy={checkingPlan} className="flex-1 sm:flex-initial">
                {checkingPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus className="h-4 w-4 mr-2" aria-hidden="true" />}
                {checkingPlan ? 'Conferindo plano…' : t('receitas.newRecipe')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('receitas.searchRecipe')}
                value={search}
                onChange={(e) => setFilter('busca', e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={value => setFilter('tipo', value)} onOpenChange={open => { if (open && !tiposQuery.isFetching) void tiposQuery.refetch(); }}>
              <SelectTrigger className="w-full" aria-label="Filtrar por tipo de produto" aria-busy={tiposQuery.isFetching} aria-describedby={tiposQuery.isError ? 'tipos-filter-error' : undefined}>
                <SelectValue placeholder={t('common.type')}>
                  {tipoFilter === 'all' ? t('receitas.allTypes') : tiposProduto.find(tipo => tipo.id === tipoFilter)?.nome || (tiposQuery.isPending ? 'Carregando tipo…' : 'Tipo indisponível')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('receitas.allTypes')}</SelectItem>
                {tiposProduto.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subReceitaFilter} onValueChange={value => setFilter('subReceita', value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sub-receitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('receitas.allRecipes')}</SelectItem>
                <SelectItem value="subreceita">{t('receitas.onlySubRecipes')}</SelectItem>
                <SelectItem value="normal">{t('receitas.excludeSubRecipes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tiposQuery.isPending && <p role="status" className="text-sm text-muted-foreground">{localizeText("Carregando tipos de produto…")}</p>}
          {tiposQuery.isError && (
            <div id="tipos-filter-error" role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-3 text-sm">
              <span>Não foi possível carregar os tipos de produto.</span>
              <Button variant="outline" disabled={tiposQuery.isFetching} onClick={() => void tiposQuery.refetch()}>Tentar novamente</Button>
            </div>
          )}
          {receitasQuery.isError && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-3">
              <span>Não foi possível carregar as receitas.</span>
              <Button variant="outline" onClick={() => void receitasQuery.refetch()}>Tentar novamente</Button>
            </div>
          )}
          <p role="status" className="text-sm text-muted-foreground">
            {receitasQuery.isFetching ? 'Carregando receitas…' : `${total} receita${total === 1 ? '' : 's'}`}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {!receitasQuery.isError && t('receitas.noRecipes')}
            </div>
          ) : (
            <div className="grid grid-cols-1 3xl:grid-cols-2 gap-4">
              {receitas.map((receita) => {
                const configKey = receita.markup?.nome
                  ? `markup_${receita.markup.nome.toLowerCase().replace(/\s+/g, '_')}`
                  : null;
                const preloadedDetalhes = configKey ? markupConfigsMap[configKey] || null : null;
                return (
                  <ReceitaCard
                    key={receita.id}
                    receita={receita}
                    onEdit={handleEdit}
                    onDelete={loadReceitas}
                    preloadedDetalhes={preloadedDetalhes}
                    isLoadingPreloaded={loadingConfigs}
                  />
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <nav aria-label="Paginação de receitas" className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page <= 1 || receitasQuery.isPlaceholderData} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" disabled={page >= totalPages || receitasQuery.isPlaceholderData} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </nav>
          )}
        </CardContent>
      </Card>

      <ExportMarkupModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        markups={markupsDisponiveis}
        loading={exportBusy}
      />
    </>
  );
}

