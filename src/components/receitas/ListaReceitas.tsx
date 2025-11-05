import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Loader2 } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import { ReceitaCard } from './ReceitaCard';
import { ReceitaForm } from './ReceitaForm';
import type { ReceitaComDados } from '@/types/receitas';

export function ListaReceitas() {
  const { fetchReceitas, loading } = useReceitas();
  const [receitas, setReceitas] = useState<ReceitaComDados[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaComDados | null>(null);

  useEffect(() => {
    loadReceitas();
  }, [search, tipoFilter, statusFilter]);

  const loadReceitas = async () => {
    const filters: any = {};
    if (search) filters.search = search;
    if (tipoFilter !== 'all') filters.tipo = tipoFilter;
    if (statusFilter !== 'all') filters.status = statusFilter;

    const data = await fetchReceitas(filters);
    setReceitas(data);
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
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
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
                <SelectItem value="doce">Doce</SelectItem>
                <SelectItem value="salgado">Salgado</SelectItem>
                <SelectItem value="bebida">Bebida</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
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
    </>
  );
}