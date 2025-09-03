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
import { Edit, Power, Search } from 'lucide-react';
import { ProductModal } from './ProductModal';

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
}

export const ListaProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

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

      await loadProdutos();
      
      toast({
        title: `Produto ${!produto.ativo ? 'ativado' : 'desativado'} com sucesso!`
      });
    } catch (error) {
      toast({
        title: "Erro ao alterar status do produto",
        variant: "destructive"
      });
    }
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

  const categorias = Array.from(
    new Set(
      produtos
        .flatMap(p => p.categorias || [])
        .filter(Boolean)
    )
  ).sort();

  const filteredProdutos = produtos.filter(produto => {
    const matchesSearch = produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo_barras?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = filterCategoria === 'todas' || 
      (produto.categorias && produto.categorias.includes(filterCategoria));
    
    return matchesSearch && matchesCategoria;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Lista de Produtos</h2>
        <p className="text-muted-foreground">
          Gerencie todos os produtos cadastrados
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="text-primary">Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-primary/30 focus:border-primary"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full sm:w-48 border-2 border-primary/30 focus:border-primary">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categorias.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="rounded-lg border border-primary/20 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/10">
                  <TableHead className="text-primary font-semibold">Nome</TableHead>
                  <TableHead className="text-primary font-semibold">Categoria</TableHead>
                  <TableHead className="text-primary font-semibold">Unidade</TableHead>
                  <TableHead className="text-primary font-semibold">Estoque</TableHead>
                  <TableHead className="text-primary font-semibold">Custo Médio</TableHead>
                  <TableHead className="text-primary font-semibold">Status</TableHead>
                  <TableHead className="text-primary font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-primary/5">
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>
                      {produto.categorias?.map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="mr-1 border-primary/40 text-primary">
                          {cat}
                        </Badge>
                      )) || '-'}
                    </TableCell>
                    <TableCell>{produto.unidade}</TableCell>
                    <TableCell>
                      <span className={produto.estoque_atual <= (produto.estoque_minimo || 0) ? 'text-destructive font-semibold' : ''}>
                        {produto.estoque_atual}
                      </span>
                    </TableCell>
                    <TableCell>R$ {produto.custo_medio.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={produto.ativo ? "default" : "secondary"} className={produto.ativo ? "bg-primary" : ""}>
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditProductModal(produto)}
                          className="border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleProdutoAtivo(produto)}
                          className={produto.ativo ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-primary/40 text-primary hover:bg-primary/10"}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredProdutos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || filterCategoria !== 'todas' 
                  ? 'Nenhum produto encontrado com os filtros aplicados' 
                  : 'Nenhum produto cadastrado'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={closeModal}
        product={selectedProduct}
        onSave={handleModalSave}
      />
    </div>
  );
};