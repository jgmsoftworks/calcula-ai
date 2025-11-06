// Fixed: All SelectItem values are non-empty strings
import { useState, useEffect } from 'react';
import { Plus, Pencil, Eye, AlertCircle, Download, Upload, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ProdutoForm } from './ProdutoForm';
import { ImportProdutosExcel } from './ImportProdutosExcel';
import { useEstoque, Produto } from '@/hooks/useEstoque';
import { useExportProdutos } from '@/hooks/useExportProdutos';
import { formatters } from '@/lib/formatters';

export function ListaProdutos() {
  const { fetchProdutos, deleteProduto } = useEstoque();
  const { exportarProdutos } = useExportProdutos();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');
  const [abaixoMinimo, setAbaixoMinimo] = useState(false);

  const loadProdutos = async (forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) {
      // Limpa o estado antes de buscar novamente
      setProdutos([]);
    }
    const data = await fetchProdutos({
      search: search || undefined,
      unidade: unidadeFiltro !== 'todas' ? unidadeFiltro : undefined,
      abaixoMinimo,
    });
    if (data) {
      setProdutos(data as unknown as Produto[]);
    }
    setLoading(false);
  };

  const handleForceRefresh = () => {
    loadProdutos(true);
  };

  useEffect(() => {
    loadProdutos();
  }, [search, unidadeFiltro, abaixoMinimo]);

  const handleEdit = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setProdutoSelecionado(undefined);
    setModalOpen(true);
  };

  const handleImportSuccess = () => {
    setImportModalOpen(false);
    loadProdutos();
  };

  const handleDelete = async (produto: Produto) => {
    if (confirm(`Tem certeza que deseja remover o produto "${produto.nome}"?`)) {
      const success = await deleteProduto(produto.id);
      if (success) {
        loadProdutos();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="Busque por nome, código interno ou código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="un">UN</SelectItem>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="g">G</SelectItem>
              <SelectItem value="l">L</SelectItem>
              <SelectItem value="ml">ML</SelectItem>
              <SelectItem value="cx">CX</SelectItem>
              <SelectItem value="pc">PC</SelectItem>
              <SelectItem value="fd">FD</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="abaixo-minimo"
              checked={abaixoMinimo}
              onCheckedChange={(checked) => setAbaixoMinimo(checked as boolean)}
            />
            <Label htmlFor="abaixo-minimo" className="cursor-pointer">
              Abaixo do mínimo
            </Label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Produto
          </Button>
          <Button onClick={handleForceRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar Dados
          </Button>
          <Button onClick={exportarProdutos} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button onClick={() => setImportModalOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
        </div>
      </Card>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Marcas</TableHead>
              <TableHead>Categorias</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque Atual</TableHead>
              <TableHead className="text-right">Custo Unit.</TableHead>
              <TableHead className="text-right">Valor em Estoque</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Carregando produtos...
                </TableCell>
              </TableRow>
            ) : produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((produto) => {
                const valorEstoque = produto.custo_unitario * produto.estoque_atual;
                const estoqueAbaixo = produto.estoque_minimo && produto.estoque_atual < produto.estoque_minimo;

                return (
                  <TableRow key={produto.id}>
                    <TableCell className="font-mono">{produto.codigo_interno}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {produto.nome}
                        {estoqueAbaixo && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Abaixo do mínimo
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {produto.marcas?.slice(0, 2).map((marca, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {marca}
                          </Badge>
                        ))}
                        {produto.marcas && produto.marcas.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{produto.marcas.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {produto.categorias?.slice(0, 2).map((categoria, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {categoria}
                          </Badge>
                        ))}
                        {produto.categorias && produto.categorias.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{produto.categorias.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase">{produto.unidade_compra}</TableCell>
                    <TableCell className="text-right">
                      {formatters.quantidadeContinua(produto.estoque_atual)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatters.valor(produto.custo_unitario)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatters.valor(valorEstoque)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(produto)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(produto)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <ProdutoForm
        produto={produtoSelecionado}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={loadProdutos}
      />

      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Produtos via Excel</DialogTitle>
          </DialogHeader>
          <ImportProdutosExcel onSuccess={handleImportSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
