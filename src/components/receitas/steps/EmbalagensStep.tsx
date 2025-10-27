import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface EmbalagensStepProps {
  receitaId: string | null;
  embalagens: Embalagem[];
  onEmbalagensChange: (embalagens: Embalagem[]) => void;
}

export function EmbalagensStep({ receitaId, embalagens, onEmbalagensChange }: EmbalagensStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para sincronizar custos das embalagens existentes
  const sincronizarCustosEmbalagens = useCallback((produtosAtualizados: any[]) => {
    const custosPorProduto = new Map(
      produtosAtualizados.map(p => [p.id, { custo_medio: p.custo_medio, unidade: p.unidade }])
    );
    
    const embalagensAtualizadas = embalagens.map(emb => {
      const custoAtualizado = custosPorProduto.get(emb.produto_id);
      if (custoAtualizado && custoAtualizado.custo_medio !== emb.custo_unitario) {
        console.log(`🔄 Sincronizando custo de "${emb.nome}": R$ ${emb.custo_unitario} → R$ ${custoAtualizado.custo_medio}`);
        return {
          ...emb,
          custo_unitario: custoAtualizado.custo_medio,
          unidade: custoAtualizado.unidade,
          custo_total: emb.quantidade * custoAtualizado.custo_medio
        };
      }
      return emb;
    });
    
    if (JSON.stringify(embalagensAtualizadas) !== JSON.stringify(embalagens)) {
      onEmbalagensChange(embalagensAtualizadas);
    }
  }, [embalagens, onEmbalagensChange]);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Buscar produtos com suas conversões (Modo de Uso) usando LEFT JOIN
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          id,
          nome,
          marcas,
          ativo,
          unidade,
          custo_medio,
          produto_conversoes (
            unidade_uso_receitas,
            custo_unitario_uso
          )
        `)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      // Transformar os dados para usar conversão quando disponível
      const produtosTransformados = (data || []).map((p: any) => {
        // Verificar se existe conversão ativa
        const conversao = p.produto_conversoes && p.produto_conversoes.length > 0 
          ? p.produto_conversoes[0] 
          : null;

        return {
          id: p.id,
          nome: p.nome,
          marcas: p.marcas,
          // Se tem conversão, usar dados da conversão; senão, usar dados do produto
          unidade: conversao?.unidade_uso_receitas || p.unidade,
          custo_medio: conversao?.custo_unitario_uso || p.custo_medio || 0
        };
      });

      setProdutos(produtosTransformados);
      
      // Sincronizar custos das embalagens existentes
      sincronizarCustosEmbalagens(produtosTransformados);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Listener para mudanças em produto_conversoes - apenas para produtos usados na receita
  useEffect(() => {
    if (!user || embalagens.length === 0) return;
    
    const produtoIds = embalagens.map(emb => emb.produto_id);
    
    const channel = supabase
      .channel('produto-conversoes-changes-embalagens')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'produto_conversoes',
          filter: `produto_id=in.(${produtoIds.join(',')})`
        },
        () => {
          console.log('🔔 Detectada atualização em embalagem usada na receita');
          carregarProdutos();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, embalagens]);

  // Listener para mudanças em produtos - apenas para produtos usados na receita
  useEffect(() => {
    if (!user || embalagens.length === 0) return;
    
    const produtoIds = embalagens.map(emb => emb.produto_id);
    
    const channel = supabase
      .channel('produtos-changes-embalagens')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'produtos',
          filter: `id=in.(${produtoIds.join(',')})AND(user_id=eq.${user.id})`
        },
        () => {
          console.log('🔔 Detectada atualização em embalagem usada na receita');
          carregarProdutos();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, embalagens]);

  const adicionarEmbalagem = (produto: any) => {
    // Verificação robusta de duplicação
    const jaExiste = embalagens.some(item => item.produto_id === produto.id);
    
    if (jaExiste) {
      toast({
        title: "Embalagem já adicionada",
        description: `"${produto.nome}" já está na lista de embalagens`,
        variant: "destructive"
      });
      return;
    }
    
    const novaEmbalagem: Embalagem = {
      id: Date.now().toString(),
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      custo_unitario: produto.custo_medio || 0,
      custo_total: produto.custo_medio || 0,
    };
    
    onEmbalagensChange([...embalagens, novaEmbalagem]);
    setSearchTerm(''); // Limpa a busca após adicionar
  };

  const removerEmbalagem = (id: string) => {
    onEmbalagensChange(embalagens.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const updatedEmbalagens = embalagens.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    );
    onEmbalagensChange(updatedEmbalagens);
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
                    <TableHead className="font-semibold text-foreground min-w-[200px]">Embalagem</TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[100px]">Quantidade</TableHead>
                    <TableHead className="font-semibold text-foreground min-w-[120px]">Custo Total</TableHead>
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