import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Percent, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EncargosVenda {
  id: string;
  nome: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  ativo: boolean;
  created_at: string;
}

export function EncargosVenda() {
  const [encargos, setEncargos] = useState<EncargosVenda[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEncargo, setEditingEncargo] = useState<EncargosVenda | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'percentual' as 'percentual' | 'fixo',
    valor: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadEncargos = async () => {
    if (!user) return;

    try {
        const { data, error } = await supabase
          .from('encargos_venda')
          .select('*')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setEncargos((data || []) as EncargosVenda[]);
    } catch (error) {
      console.error('Erro ao carregar encargos sobre venda:', error);
      toast({
        title: "Erro ao carregar encargos",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadEncargos();
  }, [user]);

  const handleSave = async () => {
    if (!user || !formData.nome || !formData.valor || !formData.tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const encargoData = {
        user_id: user.id,
        nome: formData.nome,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        ativo: true
      };

      if (editingEncargo) {
        const { error } = await supabase
          .from('encargos_venda')
          .update(encargoData)
          .eq('id', editingEncargo.id);

        if (error) throw error;

        toast({
          title: "Encargo atualizado",
          description: "Encargo sobre venda atualizado com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('encargos_venda')
          .insert(encargoData);

        if (error) throw error;

        toast({
          title: "Encargo criado",
          description: "Encargo sobre venda criado com sucesso"
        });
      }

      setIsModalOpen(false);
      setEditingEncargo(null);
      setFormData({ nome: '', tipo: 'percentual', valor: '' });
      loadEncargos();
    } catch (error) {
      console.error('Erro ao salvar encargo:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (encargo: EncargosVenda) => {
    setEditingEncargo(encargo);
    setFormData({
      nome: encargo.nome,
      tipo: encargo.tipo,
      valor: encargo.valor.toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('encargos_venda')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Encargo removido",
        description: "Encargo sobre venda removido com sucesso"
      });

      loadEncargos();
    } catch (error) {
      console.error('Erro ao remover encargo:', error);
      toast({
        title: "Erro ao remover",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleNewEncargo = () => {
    setEditingEncargo(null);
    setFormData({ nome: '', tipo: 'percentual', valor: '' });
    setIsModalOpen(true);
  };

  const formatValue = (encargo: EncargosVenda) => {
    if (encargo.tipo === 'percentual') {
      return `${encargo.valor}%`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(encargo.valor);
  };

  const getTotalPercentual = () => {
    return encargos
      .filter(e => e.tipo === 'percentual')
      .reduce((total, encargo) => total + encargo.valor, 0);
  };

  const getTotalFixo = () => {
    return encargos
      .filter(e => e.tipo === 'fixo')
      .reduce((total, encargo) => total + encargo.valor, 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Encargos sobre Venda</CardTitle>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>Total Percentual: {getTotalPercentual()}%</span>
            <span>Total Fixo: R$ {getTotalFixo().toFixed(2)}</span>
          </div>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewEncargo} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Encargo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEncargo ? 'Editar Encargo sobre Venda' : 'Novo Encargo sobre Venda'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Comissão, Taxa de cartão, ICMS..."
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={(value: 'percentual' | 'fixo') => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="valor">
                  {formData.tipo === 'percentual' ? 'Percentual *' : 'Valor Fixo *'}
                </Label>
                <Input
                  id="valor"
                  type="number"
                  step={formData.tipo === 'percentual' ? '0.01' : '0.01'}
                  min="0"
                  max={formData.tipo === 'percentual' ? '100' : undefined}
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  placeholder={formData.tipo === 'percentual' ? '0,00' : '0,00'}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  {editingEncargo ? 'Atualizar' : 'Salvar'}
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
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {encargos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum encargo sobre venda cadastrado
                </TableCell>
              </TableRow>
            ) : (
              encargos.map((encargo) => (
                <TableRow key={encargo.id}>
                  <TableCell className="font-medium">{encargo.nome}</TableCell>
                  <TableCell>
                    <Badge variant={encargo.tipo === 'percentual' ? 'default' : 'secondary'} className="gap-1">
                      {encargo.tipo === 'percentual' ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {encargo.tipo === 'percentual' ? 'Percentual' : 'Valor Fixo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatValue(encargo)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(encargo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(encargo.id)}
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