import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Plus, Power, Search, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Fornecedor {
  id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cnpj_cpf: string | null;
  representante: string | null;
  telefone_representante: string | null;
  ativo: boolean;
}

export const FornecedoresTabela = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj_cpf: '',
    email: '',
    telefone: '',
    representante: '',
    telefone_representante: '',
    endereco: ''
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

  const toggleFornecedorAtivo = async (fornecedor: Fornecedor) => {
    try {
      const { error } = await supabase
        .from('fornecedores')
        .update({ ativo: !fornecedor.ativo })
        .eq('id', fornecedor.id);

      if (error) throw error;

      await loadFornecedores();
      
      toast({
        title: `Fornecedor ${!fornecedor.ativo ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error) {
      toast({
        title: "Erro ao alterar status do fornecedor",
        variant: "destructive"
      });
    }
  };

  const openModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setSelectedFornecedor(fornecedor);
      setFormData({
        nome: fornecedor.nome,
        cnpj_cpf: fornecedor.cnpj_cpf || '',
        email: fornecedor.email || '',
        telefone: fornecedor.telefone || '',
        representante: fornecedor.representante || '',
        telefone_representante: fornecedor.telefone_representante || '',
        endereco: fornecedor.endereco || ''
      });
    } else {
      setSelectedFornecedor(null);
      setFormData({
        nome: '',
        cnpj_cpf: '',
        email: '',
        telefone: '',
        representante: '',
        telefone_representante: '',
        endereco: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedFornecedor(null);
  };

  const formatCNPJ = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara de CNPJ
    if (numbers.length <= 14) {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return numbers.slice(0, 14);
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'cnpj_cpf') {
      setFormData(prev => ({ ...prev, [field]: formatCNPJ(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
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
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim() || null,
        email: formData.email.trim() || null,
        endereco: formData.endereco.trim() || null,
        user_id: user?.id
      };

      if (selectedFornecedor) {
        const { error } = await supabase
          .from('fornecedores')
          .update(payload)
          .eq('id', selectedFornecedor.id);

        if (error) throw error;
        toast({ title: "Fornecedor atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('fornecedores')
          .insert([{ ...payload, ativo: true }]);

        if (error) throw error;
        toast({ title: "Fornecedor cadastrado com sucesso!" });
      }

      await loadFornecedores();
      closeModal();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar fornecedor",
        description: error.message?.includes('duplicate') ? "Já existe um fornecedor com esse nome" : "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFornecedores = fornecedores.filter(fornecedor =>
    fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.telefone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Fornecedores</h2>
        <p className="text-muted-foreground">
          Gerencie os fornecedores cadastrados
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-primary">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Fornecedores Cadastrados
            </span>
            <Button 
              onClick={() => openModal()}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Busca */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-lg border border-primary/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-primary font-semibold">Razão Social</TableHead>
                  <TableHead className="text-primary font-semibold">CNPJ</TableHead>
                  <TableHead className="text-primary font-semibold">Representante</TableHead>
                  <TableHead className="text-primary font-semibold">Tel. Representante</TableHead>
                  <TableHead className="text-primary font-semibold">Status</TableHead>
                  <TableHead className="text-primary font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id} className="hover:bg-primary/5">
                    <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                    <TableCell>{fornecedor.cnpj_cpf || '-'}</TableCell>
                    <TableCell>{fornecedor.representante || '-'}</TableCell>
                    <TableCell>{fornecedor.telefone_representante || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={fornecedor.ativo ? "default" : "secondary"} className={fornecedor.ativo ? "bg-primary" : ""}>
                        {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal(fornecedor)}
                          className="border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleFornecedorAtivo(fornecedor)}
                          className={fornecedor.ativo ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredFornecedores.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {selectedFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="nome">Razão Social *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  required
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: Distribuidora ABC Ltda"
                />
              </div>
              
              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CNPJ *</Label>
                <Input
                  id="cnpj_cpf"
                  value={formData.cnpj_cpf}
                  onChange={(e) => handleInputChange('cnpj_cpf', e.target.value)}
                  required
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: 12.345.678/0001-90"
                />
              </div>
              
              {/* Email Empresarial */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Empresarial</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: contato@fornecedor.com"
                />
              </div>
              
              {/* Telefone Empresarial */}
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone Empresarial</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: (11) 3333-4444"
                />
              </div>
              
              {/* Representante Comercial */}
              <div className="space-y-2">
                <Label htmlFor="representante">Representante Comercial *</Label>
                <Input
                  id="representante"
                  value={formData.representante}
                  onChange={(e) => handleInputChange('representante', e.target.value)}
                  required
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: João Silva"
                />
              </div>
              
              {/* Telefone do Representante */}
              <div className="space-y-2">
                <Label htmlFor="telefone_representante">Telefone do Representante *</Label>
                <Input
                  id="telefone_representante"
                  value={formData.telefone_representante}
                  onChange={(e) => handleInputChange('telefone_representante', e.target.value)}
                  required
                  className="border-2 border-primary/30 focus:border-primary"
                  placeholder="Ex: (11) 99999-9999"
                />
              </div>
            </div>
            
            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                className="border-2 border-primary/30 focus:border-primary"
                placeholder="Endereço completo do fornecedor..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};