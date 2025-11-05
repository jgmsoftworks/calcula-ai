import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Power } from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj_cpf: string | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  representante: string | null;
  telefone_representante: string | null;
  ativo: boolean;
}

export const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    representante: '',
    telefone_representante: '',
    endereco: '',
    ativo: true
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFornecedores();
  }, []);

  const loadFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações dos campos obrigatórios
    if (!formData.nome.trim()) {
      toast({
        title: "Razão Social é obrigatória",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.cnpj_cpf.trim()) {
      toast({
        title: "CNPJ é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.representante.trim()) {
      toast({
        title: "Representante Comercial é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.telefone_representante.trim()) {
      toast({
        title: "Telefone do Representante é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        user_id: user?.id,
        telefone: formData.telefone || null,
        email: formData.email || null,
        endereco: formData.endereco || null
      };

      if (editingFornecedor) {
        const { error } = await supabase
          .from('fornecedores')
          .update(payload)
          .eq('id', editingFornecedor.id);

        if (error) throw error;
        toast({ title: "Fornecedor atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('fornecedores')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Fornecedor cadastrado com sucesso!" });
      }

      setFormData({
        nome: '',
        cnpj_cpf: '',
        email: '',
        telefone: '',
        representante: '',
        telefone_representante: '',
        endereco: '',
        ativo: true
      });
      setEditingFornecedor(null);
      loadFornecedores();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar fornecedor",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFornecedorAtivo = async (fornecedor: Fornecedor) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update({ ativo: !fornecedor.ativo })
        .eq('id', fornecedor.id);

      if (error) throw error;
      
      toast({
        title: `Fornecedor ${!fornecedor.ativo ? 'ativado' : 'desativado'} com sucesso!`
      });
      loadFornecedores();
    } catch (error) {
      toast({
        title: "Erro ao alterar status do fornecedor",
        variant: "destructive"
      });
    }
  };

  const editFornecedor = (fornecedor: Fornecedor) => {
    setFormData({
      nome: fornecedor.nome,
      cnpj_cpf: fornecedor.cnpj_cpf || '',
      email: fornecedor.email || '',
      telefone: fornecedor.telefone || '',
      representante: fornecedor.representante || '',
      telefone_representante: fornecedor.telefone_representante || '',
      endereco: fornecedor.endereco || '',
      ativo: fornecedor.ativo
    });
    setEditingFornecedor(fornecedor);
  };

  const cancelEdit = () => {
    setEditingFornecedor(null);
    setFormData({
      nome: '',
      cnpj_cpf: '',
      email: '',
      telefone: '',
      representante: '',
      telefone_representante: '',
      endereco: '',
      ativo: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingFornecedor ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Razão Social */}
              <div>
                <Label htmlFor="nome">Razão Social *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Distribuidora ABC Ltda"
                  required
                />
              </div>

              {/* CNPJ */}
              <div>
                <Label htmlFor="cnpj_cpf">CNPJ *</Label>
                <Input
                  id="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj_cpf: e.target.value }))}
                  placeholder="Ex: 12.345.678/0001-90"
                  required
                />
              </div>

              {/* Email Empresarial */}
              <div>
                <Label htmlFor="email">Email Empresarial</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ex: contato@fornecedor.com"
                />
              </div>

              {/* Telefone Empresarial */}
              <div>
                <Label htmlFor="telefone">Telefone Empresarial</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="Ex: (11) 3333-4444"
                />
              </div>

              {/* Representante Comercial */}
              <div>
                <Label htmlFor="representante">Representante Comercial *</Label>
                <Input
                  id="representante"
                  value={formData.representante}
                  onChange={(e) => setFormData(prev => ({ ...prev, representante: e.target.value }))}
                  placeholder="Ex: João Silva"
                  required
                />
              </div>

              {/* Telefone do Representante */}
              <div>
                <Label htmlFor="telefone_representante">Telefone do Representante *</Label>
                <Input
                  id="telefone_representante"
                  value={formData.telefone_representante}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone_representante: e.target.value }))}
                  placeholder="Ex: (11) 99999-9999"
                  required
                />
              </div>
            </div>

            {/* Endereço */}
            <div>
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Endereço completo do fornecedor..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Fornecedor ativo</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editingFornecedor ? 'Atualizar' : 'Cadastrar'}
              </Button>
              {editingFornecedor && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela de Fornecedores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Representante</TableHead>
                  <TableHead>Telefone Rep.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                    <TableCell>{fornecedor.cnpj_cpf || '-'}</TableCell>
                    <TableCell>{fornecedor.representante || '-'}</TableCell>
                    <TableCell>{fornecedor.telefone_representante || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={fornecedor.ativo ? 'default' : 'secondary'}>
                        {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editFornecedor(fornecedor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFornecedorAtivo(fornecedor)}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {fornecedores.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor cadastrado ainda
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};