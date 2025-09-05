import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Edit, Search, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ProductModal } from './ProductModal';
import { ListaConfiguracoes, ColunaConfig } from './ListaConfiguracoes';

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
  custo_total: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const { user } = useAuth();
  const { toast } = useToast();

  const [colunas, setColunas] = useState<ColunaConfig[]>([
    { key: 'imagem', label: 'Imagem', visible: true, order: 0 },
    { key: 'nome', label: 'Nome', visible: true, order: 1 },
    { key: 'marca', label: 'Marca', visible: true, order: 2 },
    { key: 'categoria', label: 'Categoria', visible: true, order: 3 },
    { key: 'codigo_interno', label: 'Código Interno', visible: true, order: 4 },
    { key: 'codigo_barras', label: 'Código de Barras', visible: false, order: 5 },
    { key: 'unidade', label: 'Un. Medida', visible: false, order: 6 },
    { key: 'custo_total', label: 'Custo Total', visible: false, order: 7 },
    { key: 'custo_unitario', label: 'Custo Unitário', visible: false, order: 8 },
    { key: 'estoque_atual', label: 'Qtd. Estoque', visible: false, order: 9 },
    { key: 'estoque_minimo', label: 'Estoque Mínimo', visible: false, order: 10 }
  ]);

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
        custo_total: (produto as any).custo_total || 0,
        estoque_minimo: (produto as any).estoque_minimo || 0,
        marcas: (produto as any).marcas || null,
        categorias: (produto as any).categorias || null,
        codigo_interno: (produto as any).codigo_interno || null,
        codigo_barras: (produto as any).codigo_barras || null,
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

  const deleteProduto = async (produto: Produto) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${produto.nome}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', produto.id);

      if (error) throw error;

      await loadProdutos();
      
      toast({
        title: "Produto excluído com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir produto",
        variant: "destructive"
      });
    }
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

  // Paginação
  const totalPages = Math.ceil(filteredProdutos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProdutos = filteredProdutos.slice(startIndex, startIndex + itemsPerPage);

  // Colunas visíveis ordenadas + colunas fixas (ações e status)
  const colunasVisiveis = [
    ...colunas.filter(col => col.visible).sort((a, b) => a.order - b.order),
    { key: 'acoes', label: 'Ações', visible: true, order: 98 },
    { key: 'status', label: 'Status', visible: true, order: 99 }
  ];

  const renderCellContent = (produto: Produto, coluna: ColunaConfig) => {
    switch (coluna.key) {
      case 'imagem':
        return (
          <Avatar className="w-10 h-10">
            <AvatarImage src={produto.imagem_url || ''} alt={produto.nome} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {produto.nome.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
      case 'nome':
        return <span className="font-medium">{produto.nome}</span>;
      case 'marca':
        return produto.marcas?.map((marca, idx) => (
          <Badge key={idx} variant="outline" className="mr-1 border-primary/40 text-primary">
            {marca}
          </Badge>
        )) || '-';
      case 'categoria':
        return produto.categorias?.map((cat, idx) => (
          <Badge key={idx} variant="outline" className="mr-1 border-primary/40 text-primary">
            {cat}
          </Badge>
        )) || '-';
      case 'codigo_interno':
        return produto.codigo_interno || '-';
      case 'codigo_barras':
        return produto.codigo_barras || '-';
      case 'unidade':
        return produto.unidade;
      case 'custo_total':
        return `R$ ${(produto.custo_total || 0).toFixed(2)}`;
      case 'custo_unitario':
        return `R$ ${(produto.custo_unitario || 0).toFixed(2)}`;
      case 'estoque_atual':
        return (
          <span className={produto.estoque_atual <= (produto.estoque_minimo || 0) ? 'text-destructive font-semibold' : ''}>
            {produto.estoque_atual}
          </span>
        );
      case 'estoque_minimo':
        return produto.estoque_minimo || 0;
      case 'status':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={produto.ativo}
              onCheckedChange={() => toggleProdutoAtivo(produto)}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm font-medium ${produto.ativo ? 'text-primary' : 'text-muted-foreground'}`}>
              {produto.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        );
      case 'acoes':
        return (
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
              onClick={() => deleteProduto(produto)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Lista de Produtos</h2>
          <p className="text-muted-foreground">
            Gerencie todos os produtos cadastrados
          </p>
        </div>
        <ListaConfiguracoes
          colunas={colunas}
          onColunasChange={setColunas}
          itensPorPagina={itemsPerPage}
          onItensPorPaginaChange={setItemsPerPage}
        />
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="text-primary">
            Produtos Cadastrados ({filteredProdutos.length} produtos)
          </CardTitle>
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
                  {colunasVisiveis.map((coluna) => (
                    <TableHead key={coluna.key} className="text-primary font-semibold">
                      {coluna.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProdutos.map((produto) => (
                  <TableRow key={produto.id} className="hover:bg-primary/5">
                    {colunasVisiveis.map((coluna) => (
                      <TableCell key={coluna.key}>
                        {renderCellContent(produto, coluna)}
                      </TableCell>
                    ))}
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredProdutos.length)} de {filteredProdutos.length} produtos
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? "bg-primary" : "border-primary/40 text-primary hover:bg-primary/10"}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="border-primary/40 text-primary hover:bg-primary/10"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
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