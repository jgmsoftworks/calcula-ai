import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Power } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  estoque_atual: number;
  custo_medio: number;
  sku: string | null;
  codigo_barras: string | null;
  fornecedor_ids: string[] | null;
  ativo: boolean;
}

interface Fornecedor {
  id: string;
  nome: string;
}

export const CadastroProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    unidade: 'g' as const,
    sku: '',
    codigo_barras: '',
    fornecedor_ids: [] as string[],
    ativo: true
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProdutos();
    loadFornecedores();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        user_id: user?.id,
        fornecedor_ids: formData.fornecedor_ids.length > 0 ? formData.fornecedor_ids : null
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('produtos')
          .update(payload)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([payload]);

        if (error) throw error;
        toast({ title: "Produto cadastrado com sucesso!" });
      }

      setFormData({
        nome: '',
        categoria: '',
        unidade: 'g',
        sku: '',
        codigo_barras: '',
        fornecedor_ids: [],
        ativo: true
      });
      setEditingProduct(null);
      loadProdutos();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message?.includes('duplicate') ? "Já existe um produto com esse nome" : "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleProdutoAtivo = async (produto: Produto) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: !produto.ativo })
        .eq('id', produto.id);

      if (error) throw error;
      
      toast({
        title: `Produto ${!produto.ativo ? 'ativado' : 'desativado'} com sucesso!`
      });
      loadProdutos();
    } catch (error) {
      toast({
        title: "Erro ao alterar status do produto",
        variant: "destructive"
      });
    }
  };

  const editProduct = (produto: Produto) => {
    setFormData({
      nome: produto.nome,
      categoria: produto.categoria || '',
      unidade: produto.unidade as any,
      sku: produto.sku || '',
      codigo_barras: produto.codigo_barras || '',
      fornecedor_ids: produto.fornecedor_ids || [],
      ativo: produto.ativo
    });
    setEditingProduct(produto);
  };

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (produto.categoria && produto.categoria.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterAtivo === 'todos' || 
                         (filterAtivo === 'ativo' && produto.ativo) ||
                         (filterAtivo === 'inativo' && !produto.ativo);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulário */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingProduct ? 'Editar Produto' : 'Cadastrar Produto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Açúcar refinado"
                required
              />
            </div>

            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                placeholder="Ex: Ingredientes"
              />
            </div>

            <div>
              <Label htmlFor="unidade">Unidade *</Label>
              <Select value={formData.unidade} onValueChange={(value: any) => setFormData(prev => ({ ...prev, unidade: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gramas (g)</SelectItem>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  <SelectItem value="L">Litros (L)</SelectItem>
                  <SelectItem value="un">Unidades (un)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Ex: ACU001"
                />
              </div>
              <div>
                <Label htmlFor="codigo_barras">Código de Barras</Label>
                <Input
                  id="codigo_barras"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData(prev => ({ ...prev, codigo_barras: e.target.value }))}
                  placeholder="Ex: 1234567890123"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Produto ativo</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : editingProduct ? 'Atualizar' : 'Cadastrar'}
              </Button>
              {editingProduct && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingProduct(null);
                  setFormData({
                    nome: '',
                    categoria: '',
                    unidade: 'g',
                    sku: '',
                    codigo_barras: '',
                    fornecedor_ids: [],
                    ativo: true
                  });
                }}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterAtivo} onValueChange={(value: any) => setFilterAtivo(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Custo Médio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.categoria || '-'}</TableCell>
                    <TableCell>{produto.unidade}</TableCell>
                    <TableCell>{produto.estoque_atual.toFixed(3)}</TableCell>
                    <TableCell>R$ {produto.custo_medio.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={produto.ativo ? 'default' : 'secondary'}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editProduct(produto)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleProdutoAtivo(produto)}
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
        </CardContent>
      </Card>
    </div>
  );
};