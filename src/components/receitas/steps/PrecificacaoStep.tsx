import { useState } from 'react';
import { TrendingUp, Calculator, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function PrecificacaoStep() {
  // Mock data para cálculos - em uma implementação real, estes dados viriam do contexto da receita
  const custoIngredientes = 45.20;
  const custoSubReceitas = 12.50;
  const custoEmbalagens = 3.80;
  const valorTotalMaoObra = 25.00; // Mock value
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens + valorTotalMaoObra;
  
  // Mock data para rendimento - viria do step anterior
  const rendimentoValor = '8';
  const rendimentoUnidade = 'unidade';

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'quilo', label: 'Quilo (KG)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold mb-2">Precificação</h3>
          <p className="text-muted-foreground">Analise os custos e defina o preço final do produto</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Última Atualização</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ingredientes</span>
                <Badge variant="outline">R$ {custoIngredientes.toFixed(2)}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sub-receitas</span>
                <Badge variant="outline">R$ {custoSubReceitas.toFixed(2)}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Embalagens</span>
                <Badge variant="outline">R$ {custoEmbalagens.toFixed(2)}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mão de Obra</span>
                <Badge variant="outline">R$ {valorTotalMaoObra.toFixed(2)}</Badge>
              </div>
              
              <hr className="my-3" />
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Custo Total</span>
                <Badge className="text-base font-bold">R$ {custoTotal.toFixed(2)}</Badge>
              </div>
            </div>

            {rendimentoValor && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custo por Unidade</Label>
                  <p className="text-lg font-bold text-primary">
                    R$ {(custoTotal / (parseFloat(rendimentoValor) || 1)).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baseado no rendimento: {rendimentoValor} {unidadesRendimento.find(u => u.value === rendimentoUnidade)?.label}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Análise de Precificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Análise de Precificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Margem de Lucro Sugerida</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span className="text-sm">30% (Conservadora)</span>
                    <Badge variant="secondary">R$ {((custoTotal / (parseFloat(rendimentoValor) || 1)) * 1.3).toFixed(2)}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span className="text-sm">50% (Moderada)</span>
                    <Badge variant="secondary">R$ {((custoTotal / (parseFloat(rendimentoValor) || 1)) * 1.5).toFixed(2)}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                    <span className="text-sm">80% (Agressiva)</span>
                    <Badge variant="secondary">R$ {((custoTotal / (parseFloat(rendimentoValor) || 1)) * 1.8).toFixed(2)}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Preço Final Recomendado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Preço Sugerido (margem 50%)</p>
            <p className="text-3xl font-bold text-primary">
              R$ {((custoTotal / (parseFloat(rendimentoValor) || 1)) * 1.5).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Por {unidadesRendimento.find(u => u.value === rendimentoUnidade)?.label}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}