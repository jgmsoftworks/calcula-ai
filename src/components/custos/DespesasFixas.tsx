import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CategoriasDespesasModal } from './CategoriasDespesasModal';

interface DespesaFixa {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  vencimento?: number;
  categoria_id?: string;
  ativo: boolean;
  created_at: string;
}

interface CategoriasDespesas {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
}

export function DespesasFixas() {
  const [despesas, setDespesas] = useState<DespesaFixa[]>([]);
  const [categorias, setCategorias] = useState<CategoriasDespesas[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<DespesaFixa | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadDespesas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('despesas_fixas')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setDespesas(data || []);
    } catch (error) {
      console.error('Erro ao carregar despesas fixas:', error);
      toast({
        title: "Erro ao carregar despesas",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const loadCategorias = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('categorias_despesas_fixas')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  useEffect(() => {
    loadDespesas();
    loadCategorias();
  }, [user]);

  const handleSave = async () => {
    if (!user || !formData.nome || !formData.valor) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e valor",
        variant: "destructive"
      });
      return;
    }

    try {
      const despesaData = {
        user_id: user.id,
        nome: formData.nome,
        descricao: formData.descricao || null,
        valor: parseFloat(formData.valor.replace(/\./g, '').replace(',', '.')) || 0,
        ativo: true
      };

      if (editingDespesa) {
        const { error } = await supabase
          .from('despesas_fixas')
          .update(despesaData)
          .eq('id', editingDespesa.id);

        if (error) throw error;

        toast({
          title: "Despesa atualizada",
          description: "Despesa fixa atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('despesas_fixas')
          .insert(despesaData);

        if (error) throw error;

        toast({
          title: "Despesa criada",
          description: "Despesa fixa criada com sucesso"
        });
      }

      setIsModalOpen(false);
      setEditingDespesa(null);
      setFormData({ nome: '', descricao: '', valor: '' });
      loadDespesas();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (despesa: DespesaFixa) => {
    setEditingDespesa(despesa);
    setFormData({
      nome: despesa.nome,
      descricao: despesa.descricao || '',
      valor: formatCurrencyInput(despesa.valor)
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('despesas_fixas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Despesa removida",
        description: "Despesa fixa removida com sucesso"
      });

      loadDespesas();
    } catch (error) {
      console.error('Erro ao remover despesa:', error);
      toast({
        title: "Erro ao remover",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleNewDespesa = () => {
    setEditingDespesa(null);
    setFormData({ nome: '', descricao: '', valor: '' });
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const handleValueChange = (inputValue: string) => {
    // Remove tudo que não é dígito
    const numericValue = inputValue.replace(/\D/g, '');
    
    // Converte para número dividindo por 100 (para ter centavos)
    const numberValue = parseInt(numericValue || '0') / 100;
    
    // Formata como moeda brasileira
    const formattedValue = formatCurrencyInput(numberValue);
    
    setFormData({ ...formData, valor: formattedValue });
  };

  const getTotalDespesas = () => {
    return despesas.reduce((total, despesa) => total + despesa.valor, 0);
  };

  const getTotalByCategoria = (categoriaId: string) => {
    return despesas
      .filter(despesa => despesa.categoria_id === categoriaId)
      .reduce((total, despesa) => total + despesa.valor, 0);
  };

  const getTotalSemCategoria = () => {
    return despesas
      .filter(despesa => !despesa.categoria_id)
      .reduce((total, despesa) => total + despesa.valor, 0);
  };

  const filteredDespesas = selectedCategory
    ? despesas.filter(despesa => despesa.categoria_id === selectedCategory)
    : despesas;

  const handleCategoriaCreated = (categoria: CategoriasDespesas) => {
    setCategorias(prev => [...prev, categoria]);
  };

  const handleCategoriaUpdated = () => {
    loadCategorias();
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar com categorias */}
      <div className="col-span-12 lg:col-span-3 space-y-3">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-muted-foreground">Categorias</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCategoriaModalOpen(true)}
              className="gap-1 h-8 text-xs"
            >
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </div>
          
          {/* Total geral */}
          <div className="mb-4 p-2 bg-primary/5 rounded border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Geral:</span>
              <span className="text-sm font-bold text-primary">
                {selectedCategory 
                  ? formatCurrency(getTotalByCategoria(selectedCategory))
                  : formatCurrency(0)
                }
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {categorias.map((categoria) => (
              <button
                key={categoria.id}
                onClick={() => setSelectedCategory(categoria.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${
                  selectedCategory === categoria.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{categoria.nome}</span>
                  <span className="text-xs">{formatCurrency(getTotalByCategoria(categoria.id))}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="col-span-12 lg:col-span-9">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-primary mb-1">
                  {selectedCategory 
                    ? categorias.find(c => c.id === selectedCategory)?.nome || 'Categoria não encontrada'
                    : 'Despesas Fixas'
                  }
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {selectedCategory 
                    ? categorias.find(c => c.id === selectedCategory)?.descricao || 'Gerencie suas despesas desta categoria'
                    : 'Gerencie suas despesas mensais fixas'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">
                  {selectedCategory 
                    ? formatCurrency(getTotalByCategoria(selectedCategory))
                    : formatCurrency(0)
                  }
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lista de Despesas</h3>
              <Button onClick={handleNewDespesa} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Despesa
              </Button>
            </div>

            {filteredDespesas.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  {selectedCategory ? 'Nenhuma despesa nesta categoria' : 'Selecione uma categoria'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {selectedCategory ? 'Clique em Adicionar despesa para começar.' : 'Escolha uma categoria na sidebar para ver suas despesas.'}
                </p>
              </div>
            ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor (R$)</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredDespesas.map((despesa) => {
                    const categoria = categorias.find(c => c.id === despesa.categoria_id);
                    return (
                    <TableRow key={despesa.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{despesa.nome}</p>
                          {despesa.descricao && (
                            <p className="text-sm text-muted-foreground">{despesa.descricao}</p>
                          )}
                          {categoria && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {categoria.nome}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                       <TableCell className="font-semibold text-lg">{formatCurrency(despesa.valor)}</TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleEdit(despesa)}
                             className="h-8 w-8 p-0"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             size="sm"
                             variant="ghost"
                             onClick={() => handleDelete(despesa.id)}
                             className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingDespesa ? 'Editar Despesa' : 'Adicionar Despesa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da despesa</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Aluguel, Energia, Internet..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="valor">Valor</Label>
              <Input
                id="valor"
                value={formData.valor}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição adicional..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                {editingDespesa ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CategoriasDespesasModal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
        onCategoriaCreated={handleCategoriaCreated}
        categorias={categorias}
        onCategoriaUpdated={handleCategoriaUpdated}
      />
    </div>
  );
}