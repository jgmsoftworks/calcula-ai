import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Funcionario {
  id: string;
  nome: string;
  salario_base: number;
  adicional: number;
  desconto: number;
  ativo: boolean;
  created_at: string;
}

export function FolhaPagamento() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    salario_base: '',
    adicional: '',
    desconto: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadFuncionarios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('folha_pagamento')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar folha de pagamento:', error);
      toast({
        title: "Erro ao carregar folha",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadFuncionarios();
  }, [user]);

  const handleSave = async () => {
    if (!user || !formData.nome || !formData.salario_base) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e salário base",
        variant: "destructive"
      });
      return;
    }

    try {
      const funcionarioData = {
        user_id: user.id,
        nome: formData.nome,
        salario_base: parseFloat(formData.salario_base),
        adicional: formData.adicional ? parseFloat(formData.adicional) : 0,
        desconto: formData.desconto ? parseFloat(formData.desconto) : 0,
        ativo: true
      };

      if (editingFuncionario) {
        const { error } = await supabase
          .from('folha_pagamento')
          .update(funcionarioData)
          .eq('id', editingFuncionario.id);

        if (error) throw error;

        toast({
          title: "Funcionário atualizado",
          description: "Dados atualizados com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('folha_pagamento')
          .insert(funcionarioData);

        if (error) throw error;

        toast({
          title: "Funcionário adicionado",
          description: "Funcionário adicionado à folha com sucesso"
        });
      }

      setIsModalOpen(false);
      setEditingFuncionario(null);
      setFormData({ nome: '', salario_base: '', adicional: '', desconto: '' });
      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      nome: funcionario.nome,
      salario_base: funcionario.salario_base.toString(),
      adicional: funcionario.adicional.toString(),
      desconto: funcionario.desconto.toString()
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('folha_pagamento')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Funcionário removido",
        description: "Funcionário removido da folha com sucesso"
      });

      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      toast({
        title: "Erro ao remover",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleNewFuncionario = () => {
    setEditingFuncionario(null);
    setFormData({ nome: '', salario_base: '', adicional: '', desconto: '' });
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateSalarioLiquido = (funcionario: Funcionario) => {
    return funcionario.salario_base + funcionario.adicional - funcionario.desconto;
  };

  const getTotalFolha = () => {
    return funcionarios.reduce((total, funcionario) => total + calculateSalarioLiquido(funcionario), 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Folha de Pagamento</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total da Folha: {formatCurrency(getTotalFolha())}
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewFuncionario} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome/Cargo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João Silva, Vendedor, Gerente..."
                />
              </div>
              <div>
                <Label htmlFor="salario_base">Salário Base *</Label>
                <Input
                  id="salario_base"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salario_base}
                  onChange={(e) => setFormData({ ...formData, salario_base: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="adicional">Adicional</Label>
                <Input
                  id="adicional"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.adicional}
                  onChange={(e) => setFormData({ ...formData, adicional: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="desconto">Desconto</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.desconto}
                  onChange={(e) => setFormData({ ...formData, desconto: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  {editingFuncionario ? 'Atualizar' : 'Salvar'}
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
              <TableHead>Nome/Cargo</TableHead>
              <TableHead>Salário Base</TableHead>
              <TableHead>Adicional</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Salário Líquido</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funcionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum funcionário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              funcionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {funcionario.nome}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(funcionario.salario_base)}</TableCell>
                  <TableCell>{formatCurrency(funcionario.adicional)}</TableCell>
                  <TableCell>{formatCurrency(funcionario.desconto)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(calculateSalarioLiquido(funcionario))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(funcionario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(funcionario.id)}
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