import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Power, Plus } from 'lucide-react';
import { ProductModal } from './ProductModal';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { UpgradePlansModal } from '@/components/planos/UpgradePlansModal';

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  categorias: string[] | null;
  marcas: string[] | null;
  unidade: string;
  estoque_atual: number;
  custo_medio: number;
  custo_unitario: number;
  custo_total?: number;
  estoque_minimo: number;
  sku: string | null;
  codigo_interno: string | null;
  codigo_barras: string | null;
  imagem_url: string | null;
  fornecedor_ids: string[] | null;
  ativo: boolean;
  rotulo_porcao: string | null;
  rotulo_kcal: number | null;
  rotulo_carb: number | null;
  rotulo_prot: number | null;
  rotulo_gord_total: number | null;
  rotulo_gord_sat: number | null;
  rotulo_gord_trans: number | null;
  rotulo_fibra: number | null;
  rotulo_sodio: number | null;
  total_embalagem?: number | null;
}

interface Fornecedor {
  id: string;
  nome: string;
}

export const CadastroProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { checkLimit, showUpgradeMessage } = usePlanLimits();

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      // Map data to ensure all required fields are present with defaults
      const mappedData = (data || []).map(produto => ({
        ...produto,
        custo_unitario: (produto as any).custo_unitario || 0,
        estoque_minimo: (produto as any).estoque_minimo || 0,
        marcas: (produto as any).marcas || null,
        categorias: (produto as any).categorias || null,
        codigo_interno: (produto as any).codigo_interno || null,
        imagem_url: (produto as any).imagem_url || null,
        rotulo_porcao: (produto as any).rotulo_porcao || null,
        rotulo_kcal: (produto as any).rotulo_kcal || null,
        rotulo_carb: (produto as any).rotulo_carb || null,
        rotulo_prot: (produto as any).rotulo_prot || null,
        rotulo_gord_total: (produto as any).rotulo_gord_total || null,
        rotulo_gord_sat: (produto as any).rotulo_gord_sat || null,
        rotulo_gord_trans: (produto as any).rotulo_gord_trans || null,
        rotulo_fibra: (produto as any).rotulo_fibra || null,
        rotulo_sodio: (produto as any).rotulo_sodio || null
      }));
      
      setProdutos(mappedData);
    } catch (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
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

  const openNewProductModal = async () => {
    const limitCheck = await checkLimit('produtos');
    
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_exceeded') {
        showUpgradeMessage('produtos');
        setShowUpgradeModal(true);
      }
      return;
    }
    
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const openEditProductModal = (produto: Produto) => {
    setSelectedProduct(produto);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSave = () => {
    loadProdutos();
  };

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (produto.categoria && produto.categoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (produto.categorias && produto.categorias.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesFilter = filterAtivo === 'todos' || 
                         (filterAtivo === 'ativo' && produto.ativo) ||
                         (filterAtivo === 'inativo' && !produto.ativo);
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Produtos</CardTitle>
            <Button onClick={openNewProductModal} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </div>
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
                    <TableCell>
                      {produto.categorias && produto.categorias.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {produto.categorias.map((categoria, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {categoria}
                            </Badge>
                          ))}
                        </div>
                      ) : produto.categoria ? (
                        <Badge variant="outline" className="text-xs">
                          {produto.categoria}
                        </Badge>
                      ) : '-'}
                    </TableCell>
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
                          onClick={() => openEditProductModal(produto)}
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

      <ProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        product={selectedProduct}
        onSave={handleModalSave}
      />

      <UpgradePlansModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
};