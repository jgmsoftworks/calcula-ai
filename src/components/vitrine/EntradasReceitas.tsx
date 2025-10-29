import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Receita {
  id: string;
  nome: string;
  rendimento_unidade: string | null;
}

export function EntradasReceitas() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    receita_id: "",
    quantidade: "",
    custo_unitario: "",
    quantidade_minima: "",
    unidade: "unidades",
    observacao: "",
    data: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (user) {
      loadReceitas();
    }
  }, [user]);

  const loadReceitas = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('receitas')
        .select('id, nome, rendimento_unidade')
        .eq('user_id', user?.id)
        .eq('status', 'finalizada')
        .order('nome');

      if (error) {
        console.error('Erro ao carregar receitas:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar receitas",
          variant: "destructive",
        });
        return;
      }

      setReceitas(data || []);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar receitas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.receita_id || !formData.quantidade) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const quantidade = parseFloat(formData.quantidade);
      const custoUnitario = parseFloat(formData.custo_unitario) || 0;
      const quantidadeMinima = parseFloat(formData.quantidade_minima) || 0;

      // Verificar se já existe estoque para essa receita
      const { data: estoqueExistente } = await supabase
        .from('estoque_receitas')
        .select('*')
        .eq('user_id', user?.id)
        .eq('receita_id', formData.receita_id)
        .eq('ativo', true)
        .single();

      if (estoqueExistente) {
        // Atualizar estoque existente
        const novaQuantidade = estoqueExistente.quantidade_atual + quantidade;
        const novoCustomedio = ((estoqueExistente.quantidade_atual * estoqueExistente.custo_unitario_medio) + (quantidade * custoUnitario)) / novaQuantidade;

        const { error: updateError } = await supabase
          .from('estoque_receitas')
          .update({
            quantidade_atual: novaQuantidade,
            custo_unitario_medio: novoCustomedio,
            quantidade_minima: quantidadeMinima > 0 ? quantidadeMinima : estoqueExistente.quantidade_minima,
            unidade: formData.unidade,
            data_ultima_movimentacao: new Date().toISOString()
          })
          .eq('id', estoqueExistente.id);

        if (updateError) throw updateError;
      } else {
        // Criar novo registro de estoque
        const { error: insertError } = await supabase
          .from('estoque_receitas')
          .insert({
            user_id: user?.id,
            receita_id: formData.receita_id,
            quantidade_atual: quantidade,
            quantidade_minima: quantidadeMinima,
            unidade: formData.unidade,
            custo_unitario_medio: custoUnitario,
            data_ultima_movimentacao: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      // Registrar movimentação
      const { error: movError } = await supabase
        .from('movimentacoes_receitas')
        .insert({
          user_id: user?.id,
          receita_id: formData.receita_id,
          tipo: 'entrada',
          quantidade: quantidade,
          custo_unitario: custoUnitario,
          observacao: formData.observacao,
          data: formData.data
        });

      if (movError) throw movError;

      toast({
        title: "Sucesso",
        description: "Entrada registrada com sucesso!",
      });

      // Limpar formulário
      setFormData({
        receita_id: "",
        quantidade: "",
        custo_unitario: "",
        quantidade_minima: "",
        unidade: "unidades",
        observacao: "",
        data: new Date().toISOString().split('T')[0]
      });

    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar entrada",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceitaChange = (receitaId: string) => {
    const receita = receitas.find(r => r.id === receitaId);
    setFormData(prev => ({
      ...prev,
      receita_id: receitaId,
      unidade: receita?.rendimento_unidade || "unidades"
    }));
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
          <Plus className="h-5 w-5" />
          Registrar Entrada de Receita
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Receita */}
            <div className="space-y-2">
              <Label htmlFor="receita">Receita *</Label>
              <Select value={formData.receita_id} onValueChange={handleReceitaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma receita" />
                </SelectTrigger>
                <SelectContent>
                  {receitas.length === 0 ? (
                    <SelectItem value="no-receitas" disabled>
                      Nenhuma receita finalizada encontrada
                    </SelectItem>
                  ) : (
                    receitas.map((receita) => (
                      <SelectItem key={receita.id} value={receita.id}>
                        {receita.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

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

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade Produzida *</Label>
              <NumericInputPtBr
                tipo="quantidade_continua"
                min={0}
                value={parseFloat(formData.quantidade) || 0}
                onChange={(valor) => setFormData(prev => ({ ...prev, quantidade: valor.toString() }))}
                placeholder="Ex: 10"
              />
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={formData.unidade} onValueChange={(value) => setFormData(prev => ({ ...prev, unidade: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="g">Gramas (g)</SelectItem>
                  <SelectItem value="l">Litros (l)</SelectItem>
                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  <SelectItem value="porções">Porções</SelectItem>
                  <SelectItem value="fatias">Fatias</SelectItem>
                  <SelectItem value="pedaços">Pedaços</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custo Unitário */}
            <div className="space-y-2">
              <Label htmlFor="custo_unitario">Custo Unitário (R$)</Label>
              <NumericInputPtBr
                tipo="valor"
                min={0}
                value={parseFloat(formData.custo_unitario) || 0}
                onChange={(valor) => setFormData(prev => ({ ...prev, custo_unitario: valor.toString() }))}
                placeholder="Ex: 5.50"
              />
            </div>

            {/* Quantidade Mínima */}
            <div className="space-y-2">
              <Label htmlFor="quantidade_minima">Estoque Mínimo</Label>
              <NumericInputPtBr
                tipo="quantidade_continua"
                min={0}
                value={parseFloat(formData.quantidade_minima) || 0}
                onChange={(valor) => setFormData(prev => ({ ...prev, quantidade_minima: valor.toString() }))}
                placeholder="Ex: 5"
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
              placeholder="Observações sobre esta entrada..."
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitting || receitas.length === 0}
          >
            {submitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Registrando...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Registrar Entrada
              </>
            )}
          </Button>

          {receitas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Você precisa ter receitas finalizadas para registrar entradas.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}