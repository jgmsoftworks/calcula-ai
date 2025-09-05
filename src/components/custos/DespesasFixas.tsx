import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-semibold">Despesas Fixas</CardTitle>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewDespesa} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDespesa ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Aluguel, Energia, Internet..."
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição adicional (opcional)"
                />
              </div>
              <div>
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="vencimento">Dia do Vencimento</Label>
                <Input
                  id="vencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.vencimento}
                  onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                  placeholder="Ex: 5, 10, 15..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {despesas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma despesa fixa cadastrada
                </TableCell>
              </TableRow>
            ) : (
              despesas.map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell className="font-medium">{despesa.nome}</TableCell>
                  <TableCell>{despesa.descricao || '-'}</TableCell>
                  <TableCell>{formatCurrency(despesa.valor)}</TableCell>
                  <TableCell>
                    {despesa.vencimento ? (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        Dia {despesa.vencimento}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(despesa)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(despesa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}