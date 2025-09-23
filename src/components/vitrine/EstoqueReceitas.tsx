import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EstoqueReceita {
  id: string;
  receita_id: string;
  quantidade_atual: number;
  quantidade_minima: number;
  unidade: string;
  custo_unitario_medio: number;
  data_ultima_movimentacao: string;
  receita: {
    nome: string;
    imagem_url: string | null;
  };
}

export function EstoqueReceitas() {
  const [estoques, setEstoques] = useState<EstoqueReceita[]>([]);
  const [filteredEstoques, setFilteredEstoques] = useState<EstoqueReceita[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadEstoqueReceitas();
    }
  }, [user]);

  useEffect(() => {
    const filtered = estoques.filter(estoque =>
      estoque.receita.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEstoques(filtered);
  }, [searchTerm, estoques]);

  const loadEstoqueReceitas = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('estoque_receitas')
        .select(`
          *,
          receita:receitas(nome, imagem_url)
        `)
        .eq('user_id', user?.id)
        .eq('ativo', true)
        .order('data_ultima_movimentacao', { ascending: false });

      if (error) {
        console.error('Erro ao carregar estoque:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar estoque de receitas",
          variant: "destructive",
        });
        return;
      }

      setEstoques(data || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estoque de receitas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (atual: number, minima: number) => {
    if (atual === 0) {
      return <Badge variant="destructive">Sem estoque</Badge>;
    } else if (atual <= minima) {
      return <Badge variant="secondary">Estoque baixo</Badge>;
    } else {
      return <Badge variant="default">Normal</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar receitas no estoque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Total de Receitas</p>
                <p className="text-2xl font-bold">{estoques.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Estoque Baixo</p>
                <p className="text-2xl font-bold text-orange-500">
                  {estoques.filter(e => e.quantidade_atual <= e.quantidade_minima && e.quantidade_atual > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-500">
                  {estoques.filter(e => e.quantidade_atual === 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Estoque */}
      {filteredEstoques.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma receita em estoque</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Nenhuma receita encontrada com esse termo." : "Comece adicionando entradas de receitas."}
            </p>
            {!searchTerm && (
              <Button onClick={() => {}} variant="outline">
                Adicionar Entrada
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEstoques.map((estoque) => (
            <Card key={estoque.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{estoque.receita.nome}</CardTitle>
                    <div className="mt-2">
                      {getStatusBadge(estoque.quantidade_atual, estoque.quantidade_minima)}
                    </div>
                  </div>
                  {estoque.receita.imagem_url && (
                    <img
                      src={estoque.receita.imagem_url}
                      alt={estoque.receita.nome}
                      className="w-12 h-12 rounded-lg object-cover ml-3"
                    />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantidade</p>
                    <p className="font-semibold">
                      {estoque.quantidade_atual} {estoque.unidade}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mínimo</p>
                    <p className="font-semibold">
                      {estoque.quantidade_minima} {estoque.unidade}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo Médio</p>
                    <p className="font-semibold">
                      {formatCurrency(estoque.custo_unitario_medio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última Mov.</p>
                    <p className="font-semibold">
                      {formatDate(estoque.data_ultima_movimentacao)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor Total:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(estoque.quantidade_atual * estoque.custo_unitario_medio)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}