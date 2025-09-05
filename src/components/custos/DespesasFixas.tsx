import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface DespesaFixa {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  vencimento?: number;
  ativo: boolean;
  created_at: string;
}

export function DespesasFixas() {
  const [despesas, setDespesas] = useState<DespesaFixa[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<DespesaFixa | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
    vencimento: ''
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

  useEffect(() => {
    loadDespesas();
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
        valor: parseFloat(formData.valor),
        vencimento: formData.vencimento ? parseInt(formData.vencimento) : null,
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
      setFormData({ nome: '', descricao: '', valor: '', vencimento: '' });
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
      valor: despesa.valor.toString(),
      vencimento: despesa.vencimento?.toString() || ''
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
    setFormData({ nome: '', descricao: '', valor: '', vencimento: '' });
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalDespesas = () => {
    return despesas.reduce((total, despesa) => total + despesa.valor, 0);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar com categorias */}
      <div className="col-span-12 lg:col-span-3 space-y-3">
        <Button 
          className="w-full justify-start gap-2 h-12 bg-gradient-primary hover:bg-gradient-primary/90" 
          onClick={handleNewDespesa}
        >
          <Plus className="h-4 w-4" />
          Adicionar Despesa
        </Button>
        
        <div className="bg-card rounded-lg border p-4">
          <h3 className="font-medium text-sm text-muted-foreground mb-2">Categorias</h3>
          <div className="space-y-2">
            <div className="bg-primary/10 text-primary px-3 py-2 rounded text-sm font-medium">
              Despesas Fixas
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="col-span-12 lg:col-span-9">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-primary mb-1">Despesas Fixas</CardTitle>
                <p className="text-muted-foreground text-sm">Gerencie suas despesas mensais fixas</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(getTotalDespesas())}</p>
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

            {despesas.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground mb-2">Nenhuma despesa cadastrada</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em <strong>Adicionar despesa</strong> para começar.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor (R$)</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((despesa) => (
                    <TableRow key={despesa.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{despesa.nome}</p>
                          {despesa.descricao && (
                            <p className="text-sm text-muted-foreground">{despesa.descricao}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-lg">{formatCurrency(despesa.valor)}</TableCell>
                      <TableCell>
                        {despesa.vencimento ? (
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            Dia {despesa.vencimento}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
                  ))}
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
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
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
            <div>
              <Label htmlFor="vencimento">Dia do vencimento (opcional)</Label>
              <Input
                id="vencimento"
                type="number"
                min="1"
                max="31"
                value={formData.vencimento}
                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                placeholder="Ex: 5, 10, 15..."
                className="mt-1"
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
    </div>
  );
}