import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp, Search, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SimuladorModal } from "@/components/simulador/SimuladorModal";

interface Receita {
  id: string;
  nome: string;
  preco_venda: number;
  custo_total: number;
  custo_ingredientes: number;
  custo_embalagens: number;
  custo_mao_obra: number;
  custo_sub_receitas: number;
  markup_nome?: string;
  imagem_url?: string;
}

export default function Simulador() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceita, setSelectedReceita] = useState<Receita | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadReceitas();
    }
  }, [user]);

  const loadReceitas = async () => {
    try {
      setLoading(true);

      // Buscar receitas com seus markups para filtrar as que não são sub-receitas
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          id,
          nome,
          preco_venda,
          imagem_url,
          markups!inner(nome, tipo)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'finalizada')
        .neq('markups.tipo', 'sub-receitas')
        .neq('markups.nome', 'sub-receitas');

      if (receitasError) throw receitasError;

      // Calcular custos para cada receita
      const receitasComCustos = await Promise.all(
        receitasData.map(async (receita) => {
          // Custo ingredientes
          const { data: ingredientes } = await supabase
            .from('receita_ingredientes')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Custo embalagens
          const { data: embalagens } = await supabase
            .from('receita_embalagens')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Custo mão de obra
          const { data: maoObra } = await supabase
            .from('receita_mao_obra')
            .select('valor_total')
            .eq('receita_id', receita.id);

          // Custo sub-receitas
          const { data: subReceitas } = await supabase
            .from('receita_sub_receitas')
            .select('custo_total')
            .eq('receita_id', receita.id);

          const custo_ingredientes = ingredientes?.reduce((acc, item) => acc + (Number(item.custo_total) || 0), 0) || 0;
          const custo_embalagens = embalagens?.reduce((acc, item) => acc + (Number(item.custo_total) || 0), 0) || 0;
          const custo_mao_obra = maoObra?.reduce((acc, item) => acc + (Number(item.valor_total) || 0), 0) || 0;
          const custo_sub_receitas = subReceitas?.reduce((acc, item) => acc + (Number(item.custo_total) || 0), 0) || 0;
          const custo_total = custo_ingredientes + custo_embalagens + custo_mao_obra + custo_sub_receitas;

          return {
            id: receita.id,
            nome: receita.nome,
            preco_venda: Number(receita.preco_venda) || 0,
            custo_total,
            custo_ingredientes,
            custo_embalagens,
            custo_mao_obra,
            custo_sub_receitas,
            markup_nome: receita.markups?.nome,
            imagem_url: receita.imagem_url,
          };
        })
      );

      setReceitas(receitasComCustos);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      toast({
        title: "Erro ao carregar receitas",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredReceitas = receitas.filter((receita) =>
    receita.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calcularMargem = (precoVenda: number, custoTotal: number) => {
    return precoVenda - custoTotal;
  };

  const calcularPercentualLucro = (precoVenda: number, custoTotal: number) => {
    if (precoVenda === 0) return 0;
    return ((precoVenda - custoTotal) / precoVenda) * 100;
  };

  const handleSimular = (receita: Receita) => {
    setSelectedReceita(receita);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Simulador de Preços</h1>
            <p className="text-muted-foreground mt-2">
              Simule diferentes cenários de preço para suas receitas
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Simulador de Preços</h1>
          <p className="text-muted-foreground mt-2">
            Simule diferentes cenários de preço para suas receitas finalizadas
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar receitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {receitas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Receitas</p>
                  <p className="text-2xl font-bold">{receitas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Receita Média</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(receitas.reduce((acc, r) => acc + r.preco_venda, 0) / receitas.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Margem Média</p>
                  <p className="text-2xl font-bold">
                    {(receitas.reduce((acc, r) => acc + calcularPercentualLucro(r.preco_venda, r.custo_total), 0) / receitas.length).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Receitas Grid */}
      {filteredReceitas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma receita encontrada</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Você ainda não possui receitas finalizadas para simular.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceitas.map((receita) => {
            const margem = calcularMargem(receita.preco_venda, receita.custo_total);
            const percentualLucro = calcularPercentualLucro(receita.preco_venda, receita.custo_total);
            const isLucro = margem > 0;

            return (
              <Card key={receita.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{receita.nome}</CardTitle>
                      {receita.markup_nome && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {receita.markup_nome}
                        </Badge>
                      )}
                    </div>
                    {receita.imagem_url && (
                      <img
                        src={receita.imagem_url}
                        alt={receita.nome}
                        className="w-16 h-16 object-cover rounded-md ml-3"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Preço Atual:</span>
                      <span className="font-semibold">{formatCurrency(receita.preco_venda)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Custo Total:</span>
                      <span className="font-semibold">{formatCurrency(receita.custo_total)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Margem:</span>
                      <span className={`font-semibold ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(margem)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Lucro:</span>
                      <span className={`font-semibold ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                        {percentualLucro.toFixed(1)}%
                      </span>
                    </div>

                    <Button 
                      onClick={() => handleSimular(receita)}
                      className="w-full mt-4"
                      variant="outline"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Simular Preços
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Simulação */}
      {selectedReceita && (
        <SimuladorModal
          receita={selectedReceita}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </div>
  );
}