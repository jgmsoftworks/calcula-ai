import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  marcas?: string[];
}

interface Produto {
  id: string;
  nome: string;
  unidade: string;
  custo_medio: number;
  marcas?: string[];
}

interface IngredientesStepProps {
  receitaId: string;
  ingredientes: Ingrediente[];
  onIngredientesChange: (ingredientes: Ingrediente[]) => void;
}

export function IngredientesStep({ receitaId, ingredientes, onIngredientesChange }: IngredientesStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadProdutos();
    loadIngredientesSalvos();
  }, [receitaId]);

  const loadIngredientesSalvos = async () => {
    try {
      const { data, error } = await supabase
        .from('receita_ingredientes')
        .select('*')
        .eq('receita_id', receitaId);

      if (error) {
        console.error('Erro ao carregar ingredientes salvos:', error);
        return;
      }

      if (data && data.length > 0) {
        const ingredientesSalvos: Ingrediente[] = data.map(item => ({
          id: item.id,
          produto_id: item.produto_id,
          nome: item.nome,
          quantidade: Number(item.quantidade),
          unidade: item.unidade,
          custo_unitario: Number(item.custo_unitario),
          custo_total: Number(item.custo_total),
          marcas: item.marcas || []
        }));
        onIngredientesChange(ingredientesSalvos);
      }
    } catch (error) {
      console.error('Erro ao carregar ingredientes salvos:', error);
    }
  };

  const salvarIngredientes = async (novosIngredientes: Ingrediente[]) => {
    try {
      // Remover ingredientes existentes
      await supabase
        .from('receita_ingredientes')
        .delete()
        .eq('receita_id', receitaId);

      // Adicionar novos ingredientes
      if (novosIngredientes.length > 0) {
        const ingredientesParaSalvar = novosIngredientes.map(ingrediente => ({
          receita_id: receitaId,
          produto_id: ingrediente.produto_id,
          nome: ingrediente.nome,
          quantidade: ingrediente.quantidade,
          unidade: ingrediente.unidade,
          custo_unitario: ingrediente.custo_unitario,
          custo_total: ingrediente.custo_total,
          marcas: ingrediente.marcas || []
        }));

        const { error } = await supabase
          .from('receita_ingredientes')
          .insert(ingredientesParaSalvar);

        if (error) {
          console.error('Erro ao salvar ingredientes:', error);
          toast({
            title: "Erro",
            description: "Não foi possível salvar os ingredientes.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Erro ao salvar ingredientes:', error);
    }
  };

  const loadProdutos = async () => {
    try {
      setLoading(true);
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('id, nome, unidade, custo_medio, marcas')
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro ao carregar produtos:', error);
        return;
      }

      setProdutosDisponiveis(produtos || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const adicionarIngrediente = (produto: Produto) => {
    const novoIngrediente: Ingrediente = {
      id: Date.now().toString(),
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      custo_unitario: produto.custo_medio,
      custo_total: produto.custo_medio,
      marcas: produto.marcas,
    };
    
    const novosIngredientes = [...ingredientes, novoIngrediente];
    onIngredientesChange(novosIngredientes);
    salvarIngredientes(novosIngredientes);
    setSearchTerm(''); // Limpa a busca após adicionar
  };

  const removerIngrediente = (id: string) => {
    const novosIngredientes = ingredientes.filter(item => item.id !== id);
    onIngredientesChange(novosIngredientes);
    salvarIngredientes(novosIngredientes);
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const updatedIngredientes = ingredientes.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    );
    onIngredientesChange(updatedIngredientes);
    salvarIngredientes(updatedIngredientes);
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

      <div className="space-y-6">
        {/* Buscar Produtos */}
        <div>
          <Label htmlFor="search" className="text-sm font-medium">
            Buscar Produtos
          </Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="search"
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Resultados da Busca */}
          {searchTerm && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Carregando produtos...</p>
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum produto encontrado</p>
                  <p className="text-sm">Cadastre produtos no estoque primeiro</p>
                </div>
              ) : (
                produtosFiltrados.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {produto.custo_medio.toFixed(2)} / {produto.unidade}
                      </p>
                      {produto.marcas && produto.marcas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {produto.marcas.map((marca, index) => (
                            <Badge key={index} variant="outline" className="text-xs py-0">
                              {marca}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => adicionarIngrediente(produto)}
                      disabled={ingredientes.some(item => item.produto_id === produto.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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
                           {ingrediente.marcas && ingrediente.marcas.length > 0 && (
                             <div className="flex flex-wrap gap-1 mt-1">
                               {ingrediente.marcas.map((marca, index) => (
                                 <Badge key={index} variant="outline" className="text-xs py-0">
                                   {marca}
                                 </Badge>
                               ))}
                             </div>
                           )}
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