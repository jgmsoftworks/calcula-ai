import { useState, useEffect } from 'react';
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
import type { ReceitaComDados } from '@/types/receitas';

export function ListaReceitas() {
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

  useEffect(() => {
    loadTiposProduto();
  }, []);

  useEffect(() => {
    loadReceitas();
  }, [search, tipoFilter, subReceitaFilter]);

  const loadReceitas = async () => {
    const filters: any = {};
    if (search) filters.search = search;
    if (tipoFilter !== 'all') filters.tipo = tipoFilter;
    if (subReceitaFilter !== 'all') filters.subReceita = subReceitaFilter;

    const data = await fetchReceitas(filters);
    setReceitas(data);
  };

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
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Receitas</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                onClick={handleExportClick}
                variant="outline"
                className="flex-1 sm:flex-initial"
                disabled={receitas.length === 0 || exporting}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </>
                )}
              </Button>
              <Button onClick={() => setShowForm(true)} className="flex-1 sm:flex-initial">
                <Plus className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar receita..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
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
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="subreceita">Apenas Sub-receitas</SelectItem>
                <SelectItem value="normal">Excluir Sub-receitas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma receita cadastrada
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {receitas.map((receita) => (
                <ReceitaCard
                  key={receita.id}
                  receita={receita}
                  onEdit={handleEdit}
                  onDelete={loadReceitas}
                />
              ))}
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