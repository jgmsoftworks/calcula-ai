import { useState, useEffect } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

export function EmbalagensStep() {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const adicionarEmbalagem = (produto: any) => {
    const novaEmbalagem: Embalagem = {
      id: Date.now().toString(),
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      custo_unitario: produto.custo_medio || 0,
      custo_total: produto.custo_medio || 0,
    };
    
    setEmbalagens([...embalagens, novaEmbalagem]);
    setSearchTerm(''); // Limpa a busca após adicionar
  };

  const removerEmbalagem = (id: string) => {
    setEmbalagens(embalagens.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    setEmbalagens(embalagens.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    ));
  };

  const custoTotalEmbalagens = embalagens.reduce((total, item) => total + item.custo_total, 0);
  
  const produtosFiltrados = produtos.filter(produto =>
    searchTerm.trim() !== '' && produto.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adicionar Embalagens (Opcional)</h3>
        <p className="text-muted-foreground">Selecione as embalagens necessárias para esta receita, se houver</p>
      </div>

      <div className="space-y-6">
        {/* Busca de Embalagens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar Embalagens</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Digite o nome da embalagem para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          {searchTerm.trim() !== '' && (
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {produtos.length === 0 ? 'Nenhum produto cadastrado no estoque' : 'Nenhum produto encontrado'}
                </div>
              ) : (
                produtosFiltrados.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <p className="font-medium">{produto.nome}</p>
                      <div className="flex flex-col gap-1">
                        {produto.marcas && produto.marcas.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {produto.marcas.map((marca: string, index: number) => (
                              <span key={index} className="block">{marca}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          R$ {(produto.custo_medio || 0).toFixed(2)} / {produto.unidade}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => adicionarEmbalagem(produto)}
                      disabled={embalagens.some(item => item.produto_id === produto.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>

        {/* Embalagens Selecionadas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Embalagens da Receita</CardTitle>
              <Badge variant="secondary">
                Total: R$ {custoTotalEmbalagens.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {embalagens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma embalagem adicionada</p>
                <p className="text-sm">Use a busca acima para adicionar embalagens (opcional)</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Embalagem</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {embalagens.map((embalagem) => (
                    <TableRow key={embalagem.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{embalagem.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {embalagem.custo_unitario.toFixed(2)} / {embalagem.unidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={embalagem.quantidade}
                          onChange={(e) => atualizarQuantidade(embalagem.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">R$ {embalagem.custo_total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerEmbalagem(embalagem.id)}
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