import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ReceitaForm } from './ReceitaForm';
import { ExportMarkupModal } from './ExportMarkupModal';
import { useTranslation } from 'react-i18next';
import type { ReceitaComDados } from '@/types/receitas';

export function ListaReceitas() {
  const { t } = useTranslation();
  const { fetchReceitas, fetchTiposProduto, loading } = useReceitas();
  const { exportarReceitas, exporting } = useExportReceitas();
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<ReceitaComDados[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [subReceitaFilter, setSubReceitaFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaComDados | null>(null);
  const [tiposProduto, setTiposProduto] = useState<Array<{ id: string; nome: string }>>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [markupsDisponiveis, setMarkupsDisponiveis] = useState<Array<{ id: string; nome: string }>>([]);
  const [markupConfigsMap, setMarkupConfigsMap] = useState<Record<string, any>>({});
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const requestIdRef = useRef(0);
  useEffect(() => {
    loadTiposProduto();
    loadMarkupConfigs();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadReceitas();
    }, search.trim() ? 350 : 0);

    return () => clearTimeout(timer);
  }, [search, tipoFilter, subReceitaFilter]);

  const loadMarkupConfigs = async () => {
    if (!user) return;
    setLoadingConfigs(true);
    try {
      const { data } = await supabase
        .from('user_configurations')
        .select('type, configuration')
        .eq('user_id', user.id)
        .ilike('type', 'markup_%');
      
      const map: Record<string, any> = {};
      data?.forEach((item) => {
        map[item.type] = item.configuration;
      });
      setMarkupConfigsMap(map);
    } catch (error) {
      console.error('Erro ao carregar configs de markup:', error);
    } finally {
      setLoadingConfigs(false);
    }
  };

  // Ref para debounce do real-time
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const jaCarregouRef = useRef(false);

  // Função debounced para carregar receitas
  const debouncedLoadReceitas = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadReceitas();
    }, 500); // Esperar 500ms antes de recarregar
  }, [search, tipoFilter, subReceitaFilter]);

  // Real-time subscription para atualizar lista quando receitas mudarem
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Configurando real-time updates para lista de receitas');
    
    const channel = supabase
      .channel('lista-receitas-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'receitas',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Receita atualizada em tempo real:', payload);
          debouncedLoadReceitas(); // Usar versão debounced
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando real-time de receitas');
      supabase.removeChannel(channel);
    };
  }, [user, debouncedLoadReceitas]);

  const sincronizarPrecosSubReceitas = async (receitasCarregadas: ReceitaComDados[]) => {
    if (!user) return;
    
    // Filtrar apenas sub-receitas com preço diferente do custo
    const subReceitasDesatualizadas = receitasCarregadas.filter(r => {
      if (r.markup?.tipo !== 'sub_receita') return false;
      
      const custoTotal = (r.custo_ingredientes || 0) + 
                         (r.custo_embalagens || 0) + 
                         (r.custo_mao_obra || 0) + 
                         (r.custo_sub_receitas || 0);
      
      // Se a diferença for significativa (mais de 0.01)
      return Math.abs(r.preco_venda - custoTotal) > 0.01;
    });
    
    if (subReceitasDesatualizadas.length === 0) return;
    
    console.log(`🔄 Atualizando ${subReceitasDesatualizadas.length} sub-receitas com preços desatualizados`);
    
    // Atualizar cada sub-receita
    for (const receita of subReceitasDesatualizadas) {
      const custoTotal = (receita.custo_ingredientes || 0) + 
                         (receita.custo_embalagens || 0) + 
                         (receita.custo_mao_obra || 0) + 
                         (receita.custo_sub_receitas || 0);
      
      await supabase
        .from('receitas')
        .update({ preco_venda: custoTotal })
        .eq('id', receita.id)
        .eq('user_id', user.id);
    }
  };

  const loadReceitas = async () => {
    const requestId = ++requestIdRef.current;
    const filters: any = {};
    const normalizedSearch = search.trim();
    if (normalizedSearch) filters.search = normalizedSearch;
    if (tipoFilter !== 'all') filters.tipo = tipoFilter;
    if (subReceitaFilter !== 'all') filters.subReceita = subReceitaFilter;

    const data = await fetchReceitas(filters);
    if (requestId !== requestIdRef.current) return;
    setReceitas(data);
    
    // NÃO sincronizar aqui - será feito separadamente
  };

  // Sincronizar apenas UMA VEZ após primeira carga
  useEffect(() => {
    if (receitas.length > 0 && !jaCarregouRef.current) {
      jaCarregouRef.current = true;
      sincronizarPrecosSubReceitas(receitas);
    }
  }, [receitas.length]);

  const loadTiposProduto = async () => {
    const tipos = await fetchTiposProduto();
    setTiposProduto(tipos);
  };

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
    await exportarReceitas(receitas, markupId, markupNome);
  };

  const handleEdit = (receita: ReceitaComDados) => {
    setEditingReceita(receita);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReceita(null);
    loadReceitas();
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>{t('receitas.recipes')}</CardTitle>
            <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto">
              <Button 
                onClick={handleExportClick}
                variant="outline"
                className="flex-1 sm:flex-initial"
                disabled={receitas.length === 0 || exporting}
              >
                {exporting ? (
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
              <Button onClick={() => setShowForm(true)} className="flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 mr-2" />
                {t('receitas.newRecipe')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('receitas.searchRecipe')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('common.type')} />
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
            <Select value={subReceitaFilter} onValueChange={setSubReceitaFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sub-receitas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('receitas.allRecipes')}</SelectItem>
                <SelectItem value="subreceita">{t('receitas.onlySubRecipes')}</SelectItem>
                <SelectItem value="normal">{t('receitas.excludeSubRecipes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('receitas.noRecipes')}
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
        </CardContent>
      </Card>

      {showForm && (
        <ReceitaForm
          receita={editingReceita}
          onClose={handleCloseForm}
        />
      )}

      <ExportMarkupModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportConfirm}
        markups={markupsDisponiveis}
        loading={exporting}
      />
    </>
  );
}

