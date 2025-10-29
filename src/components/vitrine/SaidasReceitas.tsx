import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, ShoppingCart, Trash2, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EstoqueReceita {
  id: string;
  receita_id: string;
  quantidade_atual: number;
  unidade: string;
  receita: {
    nome: string;
  };
}

type TipoSaida = 'venda' | 'perdas' | 'brindes';

export function SaidasReceitas() {
  const [estoques, setEstoques] = useState<EstoqueReceita[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    receita_id: "",
    tipo: "venda" as TipoSaida,
    quantidade: "",
    preco_venda: "",
    observacao: "",
    data: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      loadEstoqueReceitas();
    }
  }, [user]);

  const loadEstoqueReceitas = async () => {
    try {
      setLoading(true);
      
      // Carregar estoque
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('estoque_receitas')
        .select('id, receita_id, quantidade_atual, unidade')
        .eq('user_id', user?.id)
        .eq('ativo', true)
        .gt('quantidade_atual', 0);

      if (estoqueError) {
        console.error('Erro ao carregar estoques:', estoqueError);
        toast({
          title: "Erro",
          description: "Erro ao carregar receitas em estoque",
          variant: "destructive",
        });
        return;
      }

      if (!estoqueData || estoqueData.length === 0) {
        setEstoques([]);
        return;
      }

      // Carregar receitas relacionadas
      const receitaIds = estoqueData.map(e => e.receita_id);
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select('id, nome')
        .in('id', receitaIds)
        .order('nome');

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        toast({
          title: "Erro",
          description: "Erro ao carregar receitas",
          variant: "destructive",
        });
        return;
      }

      // Combinar dados
      const estoquesComReceitas = estoqueData.map(estoque => {
        const receita = receitasData?.find(r => r.id === estoque.receita_id);
        return {
          ...estoque,
          receita: {
            nome: receita?.nome || 'Receita não encontrada'
          }
        };
      });

      setEstoques(estoquesComReceitas);
    } catch (error) {
      console.error('Erro ao carregar estoques:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar receitas em estoque",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.receita_id || !formData.quantidade || !formData.tipo) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const quantidade = parseFloat(formData.quantidade);
    const precoVenda = parseFloat(formData.preco_venda) || 0;
    
    // Verificar se há estoque suficiente
    const estoque = estoques.find(e => e.receita_id === formData.receita_id);
    if (!estoque || estoque.quantidade_atual < quantidade) {
      toast({
        title: "Erro",
        description: "Quantidade insuficiente em estoque",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Registrar movimentação
      const { error: movError } = await supabase
        .from('movimentacoes_receitas')
        .insert({
          user_id: user?.id,
          receita_id: formData.receita_id,
          tipo: formData.tipo,
          quantidade: quantidade,
          preco_venda: formData.tipo === 'venda' ? precoVenda : 0,
          observacao: formData.observacao,
          data: formData.data
        });

      if (movError) throw movError;

      // Atualizar estoque
      const novaQuantidade = estoque.quantidade_atual - quantidade;
      const { error: updateError } = await supabase
        .from('estoque_receitas')
        .update({
          quantidade_atual: novaQuantidade,
          data_ultima_movimentacao: new Date().toISOString()
        })
        .eq('id', estoque.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: `${getTipoLabel(formData.tipo)} registrada com sucesso!`,
      });

      // Limpar formulário e recarregar dados
      setFormData({
        receita_id: "",
        tipo: "venda",
        quantidade: "",
        preco_venda: "",
        observacao: "",
        data: new Date().toISOString().split('T')[0]
      });
      
      loadEstoqueReceitas();

    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar saída",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTipoLabel = (tipo: TipoSaida) => {
    switch (tipo) {
      case 'venda': return 'Venda';
      case 'perdas': return 'Perdas';
      case 'brindes': return 'Brindes';
      default: return tipo;
    }
  };

  const getTipoIcon = (tipo: TipoSaida) => {
    switch (tipo) {
      case 'venda': return <ShoppingCart className="h-4 w-4" />;
      case 'perdas': return <Trash2 className="h-4 w-4" />;
      case 'brindes': return <Gift className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getEstoqueAtual = () => {
    const estoque = estoques.find(e => e.receita_id === formData.receita_id);
    return estoque ? `${estoque.quantidade_atual} ${estoque.unidade}` : '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Minus className="h-5 w-5" />
          Registrar Saída de Receita
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Receita */}
            <div className="space-y-2">
              <Label htmlFor="receita">Receita *</Label>
              <Select value={formData.receita_id} onValueChange={(value) => setFormData(prev => ({ ...prev, receita_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma receita" />
                </SelectTrigger>
                <SelectContent>
                  {estoques.length === 0 ? (
                    <SelectItem value="no-estoque" disabled>
                      Nenhuma receita em estoque
                    </SelectItem>
                  ) : (
                    estoques.map((estoque) => (
                      <SelectItem key={estoque.receita_id} value={estoque.receita_id}>
                        {estoque.receita.nome} ({estoque.quantidade_atual} {estoque.unidade})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formData.receita_id && (
                <p className="text-sm text-muted-foreground">
                  Estoque atual: {getEstoqueAtual()}
                </p>
              )}
            </div>

            {/* Tipo de Saída */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Saída *</Label>
              <Select value={formData.tipo} onValueChange={(value: TipoSaida) => setFormData(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Venda
                    </div>
                  </SelectItem>
                  <SelectItem value="perdas">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Perdas
                    </div>
                  </SelectItem>
                  <SelectItem value="brindes">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Brindes
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <NumericInputPtBr
                tipo="quantidade_continua"
                min={0}
                value={parseFloat(formData.quantidade) || 0}
                onChange={(valor) => setFormData(prev => ({ ...prev, quantidade: valor.toString() }))}
                placeholder="Ex: 5"
              />
            </div>

            {/* Preço de Venda (apenas para vendas) */}
            {formData.tipo === 'venda' && (
              <div className="space-y-2">
                <Label htmlFor="preco_venda">Preço de Venda Unitário (R$)</Label>
                <NumericInputPtBr
                  tipo="valor"
                  min={0}
                  value={parseFloat(formData.preco_venda) || 0}
                  onChange={(valor) => setFormData(prev => ({ ...prev, preco_venda: valor.toString() }))}
                  placeholder="Ex: 15.00"
                />
              </div>
            )}

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
              placeholder={
                formData.tipo === 'perdas' 
                  ? "Motivo da perda (ex: vencimento, dano, etc.)"
                  : formData.tipo === 'brindes'
                  ? "Destinatário ou evento (ex: degustação, marketing)"
                  : "Observações sobre esta saída..."
              }
              rows={3}
            />
            {formData.tipo === 'perdas' && (
              <p className="text-sm text-muted-foreground">
                Para perdas, é recomendado especificar o motivo.
              </p>
            )}
          </div>

          {/* Total da Venda */}
          {formData.tipo === 'venda' && formData.quantidade && formData.preco_venda && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total da Venda:</span>
                <span className="text-lg font-bold text-primary">
                  R$ {(parseFloat(formData.quantidade) * parseFloat(formData.preco_venda)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitting || estoques.length === 0}
          >
            {submitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Registrando...
              </>
            ) : (
              <>
                {getTipoIcon(formData.tipo)}
                <span className="ml-2">Registrar {getTipoLabel(formData.tipo)}</span>
              </>
            )}
          </Button>

          {estoques.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma receita disponível em estoque.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}