import { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

export function IngredientesStep() {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data de produtos disponíveis
  const produtosDisponiveis = [
    { id: '1', nome: 'Farinha de Trigo', unidade: 'kg', custo_unitario: 4.50 },
    { id: '2', nome: 'Açúcar Cristal', unidade: 'kg', custo_unitario: 3.20 },
    { id: '3', nome: 'Ovos', unidade: 'un', custo_unitario: 0.80 },
    { id: '4', nome: 'Chocolate em Pó', unidade: 'kg', custo_unitario: 12.00 },
    { id: '5', nome: 'Leite Integral', unidade: 'L', custo_unitario: 5.50 },
  ];

  const adicionarIngrediente = (produto: any) => {
    const novoIngrediente: Ingrediente = {
      id: Date.now().toString(),
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      custo_unitario: produto.custo_unitario,
      custo_total: produto.custo_unitario,
    };
    
    setIngredientes([...ingredientes, novoIngrediente]);
  };

  const removerIngrediente = (id: string) => {
    setIngredientes(ingredientes.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    setIngredientes(ingredientes.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    ));
  };

  const custoTotalIngredientes = ingredientes.reduce((total, item) => total + item.custo_total, 0);
  
  const produtosFiltrados = produtosDisponiveis.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adicionar Ingredientes</h3>
        <p className="text-muted-foreground">Selecione os produtos que fazem parte desta receita</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Produtos Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produtos Disponíveis</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {produtosFiltrados.map((produto) => (
              <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div>
                  <p className="font-medium">{produto.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {produto.custo_unitario.toFixed(2)} / {produto.unidade}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => adicionarIngrediente(produto)}
                  disabled={ingredientes.some(item => item.produto_id === produto.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ingredientes Selecionados */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Ingredientes da Receita</CardTitle>
              <Badge variant="secondary">
                Total: R$ {custoTotalIngredientes.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {ingredientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum ingrediente adicionado</p>
                <p className="text-sm">Selecione produtos da lista ao lado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientes.map((ingrediente) => (
                    <TableRow key={ingrediente.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{ingrediente.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {ingrediente.custo_unitario.toFixed(2)} / {ingrediente.unidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ingrediente.quantidade}
                          onChange={(e) => atualizarQuantidade(ingrediente.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">R$ {ingrediente.custo_total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerIngrediente(ingrediente.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}