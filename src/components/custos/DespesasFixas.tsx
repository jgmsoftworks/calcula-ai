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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CategoriasDespesasModal } from './CategoriasDespesasModal';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { formatters } from '@/lib/formatters';

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
    valor: '',
    categoria_id: null as string | null
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
      const valorNumerico = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.')) || 0;
      
      const categoriaFinal = formData.categoria_id ?? (selectedCategory && selectedCategory !== 'sem-categoria' ? selectedCategory : null);
      const despesaData = {
        user_id: user.id,
        nome: formData.nome,
        descricao: formData.descricao || null,
        valor: valorNumerico,
        categoria_id: categoriaFinal,
        ativo: true
      };

      console.log('Dados da despesa:', despesaData);
      console.log('Categoria selecionada:', selectedCategory);

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
        const { data, error } = await supabase
          .from('despesas_fixas')
          .insert(despesaData)
          .select();

        if (error) throw error;
        
        console.log('Despesa criada:', data);

        toast({
          title: "Despesa criada",
          description: "Despesa fixa criada com sucesso"
        });
      }

      setIsModalOpen(false);
      setEditingDespesa(null);
      setFormData({ nome: '', descricao: '', valor: '', categoria_id: null });
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
      valor: formatCurrencyInput(despesa.valor),
      categoria_id: despesa.categoria_id ?? null
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('despesas_fixas')
        .delete()
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
    setFormData({
      nome: '',
      descricao: '',
      valor: '',
      categoria_id: selectedCategory && selectedCategory !== 'sem-categoria' ? selectedCategory : null
    });
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
    // Soma TODAS as despesas (com e sem categoria)
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

  const filteredDespesas = selectedCategory === 'sem-categoria'
    ? despesas.filter(despesa => !despesa.categoria_id)
    : selectedCategory
    ? despesas.filter(despesa => despesa.categoria_id === selectedCategory)
    : despesas;

  const handleCategoriaCreated = (categoria: CategoriasDespesas) => {
    setCategorias(prev => [...prev, categoria]);
  };

  const handleCategoriaUpdated = () => {
    loadCategorias();
  };

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      {/* Sidebar com categorias */}
      <div className="col-span-12 lg:col-span-3 space-y-3">
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categorias</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCategoriaModalOpen(true)}
                className="gap-1 h-7 text-xs rounded-xl border-border/50"
              >
                <Plus className="h-3 w-3" />
                Adicionar
              </Button>
            </div>
            
            {/* Total geral */}
            <div className="mb-4 p-3 rounded-xl bg-[#0483e4]/5 border border-[#0483e4]/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total Geral</span>
                <span className="text-sm font-bold font-display text-[#0483e4]">
                  {formatters.valor(getTotalDespesas())}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {categorias.map((categoria) => (
                <button
                  key={categoria.id}
                  onClick={() => setSelectedCategory(categoria.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === categoria.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-muted-foreground border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="truncate">{categoria.nome}</span>
                    <span className="text-[10px] font-bold ml-2">{formatters.valor(getTotalByCategoria(categoria.id))}</span>
                  </div>
                </button>
              ))}
              
              {getTotalSemCategoria() > 0 && (
                <button
                  onClick={() => setSelectedCategory('sem-categoria')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === 'sem-categoria'
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-muted-foreground border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="italic truncate">Sem Categoria</span>
                    <span className="text-[10px] font-bold ml-2">{formatters.valor(getTotalSemCategoria())}</span>
                  </div>
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      <div className="col-span-12 lg:col-span-9">
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-brand-horizontal" />
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-display">
                  {selectedCategory === 'sem-categoria'
                    ? 'Sem Categoria'
                    : selectedCategory 
                    ? categorias.find(c => c.id === selectedCategory)?.nome || 'Categoria não encontrada'
                    : 'Despesas Fixas'
                  }
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedCategory === 'sem-categoria'
                    ? 'Despesas que não possuem categoria atribuída'
                    : selectedCategory 
                    ? categorias.find(c => c.id === selectedCategory)?.descricao || 'Gerencie suas despesas desta categoria'
                    : 'Gerencie suas despesas mensais fixas'
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold font-display text-foreground">
                  {selectedCategory === 'sem-categoria'
                    ? formatters.valor(getTotalSemCategoria())
                    : selectedCategory 
                    ? formatters.valor(getTotalByCategoria(selectedCategory))
                    : formatters.valor(getTotalDespesas())
                  }
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium font-display">Lista de Despesas</h3>
              <Button onClick={handleNewDespesa} variant="outline" size="sm" className="gap-1.5 h-8 rounded-xl text-xs border-border/50">
                <Plus className="h-3 w-3" />
                Adicionar Despesa
              </Button>
            </div>

            {filteredDespesas.length === 0 ? (
              <div className="text-center py-12 rounded-xl bg-muted/30 border border-dashed border-border/50">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium font-display text-muted-foreground mb-1">
                  Nenhuma despesa cadastrada
                </p>
                <p className="text-xs text-muted-foreground">
                  Clique em "Adicionar Despesa" para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDespesas.map((despesa, i) => {
                  const categoria = categorias.find(c => c.id === despesa.categoria_id);
                  return (
                    <div 
                      key={despesa.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30 hover:border-border/60 transition-all animate-slide-up"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-[#0483e4]/10">
                          <Package className="h-4 w-4 text-[#0483e4]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium font-display truncate">{despesa.nome}</p>
                          {despesa.descricao && (
                            <p className="text-[10px] text-muted-foreground truncate">{despesa.descricao}</p>
                          )}
                          {categoria && (
                            <Badge variant="secondary" className="mt-0.5 text-[10px] h-4 px-1.5">
                              {categoria.nome}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold font-display text-foreground whitespace-nowrap">{formatters.valor(despesa.valor)}</p>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(despesa)} className="h-8 w-8 p-0 rounded-xl">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(despesa.id)} className="h-8 w-8 p-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingDespesa ? 'Editar Despesa' : 'Adicionar Despesa'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs">Nome da despesa</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Aluguel, Energia, Internet..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor" className="text-xs">Valor</Label>
              <NumericInputPtBr
                tipo="valor"
                value={parseFloat(formData.valor.replace(/\./g, '').replace(',', '.')) || 0}
                onChange={(valor) => setFormData({ ...formData, valor: formatCurrencyInput(valor) })}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Categoria (opcional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCategoriaModalOpen(true)}
                  className="h-6 text-[10px] gap-1 px-2"
                >
                  <Plus className="h-3 w-3" />
                  Nova categoria
                </Button>
              </div>
              <Select
                value={formData.categoria_id ?? 'none'}
                onValueChange={(v) => setFormData({ ...formData, categoria_id: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-xs">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição adicional..."
                className="min-h-[80px]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} className="flex-1 gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                {editingDespesa ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
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
        onCategoriaUpdated={handleCategoriaUpdated}
        categorias={categorias}
      />
    </div>
  );
}