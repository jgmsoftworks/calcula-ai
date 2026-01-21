import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Plus,
  Minus,
  RotateCcw
} from "lucide-react";

interface Receita {
  id: string;
  nome: string;
  preco_venda: number;
  custo_total: number;
  custo_ingredientes: number;
  custo_embalagens: number;
  custo_mao_obra: number;
  custo_sub_receitas: number;
  imagem_url?: string;
}

interface Cenario {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface SimuladorModalProps {
  receita: Receita;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimuladorModal({ receita, open, onOpenChange }: SimuladorModalProps) {
  const [cenarios, setCenarios] = useState<Cenario[]>([
    { id: '1', nome: 'Cenário 1', preco: receita.preco_venda, quantidade: 1 }
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calcularMargem = (preco: number, custo: number) => {
    return preco - custo;
  };

  const calcularPercentualLucro = (preco: number, custo: number) => {
    if (preco === 0) return 0;
    return ((preco - custo) / preco) * 100;
  };

  const calcularLucroTotal = (preco: number, custo: number, quantidade: number) => {
    return (preco - custo) * quantidade;
  };

  const calcularFaturamentoTotal = (preco: number, quantidade: number) => {
    return preco * quantidade;
  };

  const adicionarCenario = () => {
    const novoCenario: Cenario = {
      id: Date.now().toString(),
      nome: `Cenário ${cenarios.length + 1}`,
      preco: receita.preco_venda,
      quantidade: 1
    };
    setCenarios([...cenarios, novoCenario]);
  };

  const removerCenario = (id: string) => {
    if (cenarios.length > 1) {
      setCenarios(cenarios.filter(c => c.id !== id));
    }
  };

  const atualizarCenario = (id: string, campo: 'preco' | 'quantidade', valor: number) => {
    setCenarios(cenarios.map(c => 
      c.id === id ? { ...c, [campo]: valor } : c
    ));
  };

  const resetarCenarios = () => {
    setCenarios([
      { id: '1', nome: 'Cenário 1', preco: receita.preco_venda, quantidade: 1 }
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] xl:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Simulador de Preços - {receita.nome}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações da Receita */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Receita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {receita.imagem_url && (
                  <img
                    src={receita.imagem_url}
                    alt={receita.nome}
                    className="w-full h-32 object-cover rounded-md"
                  />
                )}
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Preço Atual:</span>
                    <span className="font-semibold">{formatCurrency(receita.preco_venda)}</span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Composição de Custos:</h4>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ingredientes:</span>
                      <span>{formatCurrency(receita.custo_ingredientes)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Embalagens:</span>
                      <span>{formatCurrency(receita.custo_embalagens)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mão de Obra:</span>
                      <span>{formatCurrency(receita.custo_mao_obra)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sub-receitas:</span>
                      <span>{formatCurrency(receita.custo_sub_receitas)}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-semibold">
                      <span>Custo Total:</span>
                      <span>{formatCurrency(receita.custo_total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Simulação de Cenários */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {/* Controles */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Cenários de Simulação</h3>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetarCenarios}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resetar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={adicionarCenario}
                    disabled={cenarios.length >= 4}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cenário
                  </Button>
                </div>
              </div>

              {/* Cenários */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {cenarios.map((cenario, index) => {
                  const margem = calcularMargem(cenario.preco, receita.custo_total);
                  const percentualLucro = calcularPercentualLucro(cenario.preco, receita.custo_total);
                  const lucroTotal = calcularLucroTotal(cenario.preco, receita.custo_total, cenario.quantidade);
                  const faturamentoTotal = calcularFaturamentoTotal(cenario.preco, cenario.quantidade);
                  const diferecaPrecoAtual = cenario.preco - receita.preco_venda;
                  const isLucro = margem > 0;
                  const isPrejuizo = margem < 0;

                  return (
                    <Card key={cenario.id} className={`${isPrejuizo ? 'border-red-200' : isLucro ? 'border-green-200' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{cenario.nome}</CardTitle>
                          {cenarios.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerCenario(cenario.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Inputs */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`preco-${cenario.id}`} className="text-xs">
                              Preço de Venda
                            </Label>
                            <NumericInputPtBr
                              tipo="valor"
                              min={0}
                              value={cenario.preco}
                              onChange={(valor) => atualizarCenario(cenario.id, 'preco', valor)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`quantidade-${cenario.id}`} className="text-xs">
                              Quantidade
                            </Label>
                            <NumericInputPtBr
                              tipo="quantidade_un"
                              min={1}
                              value={cenario.quantidade}
                              onChange={(valor) => atualizarCenario(cenario.id, 'quantidade', valor)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Alertas */}
                        {isPrejuizo && (
                          <Alert variant="destructive" className="py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Preço abaixo do custo! Prejuízo de {formatCurrency(Math.abs(margem))} por unidade.
                            </AlertDescription>
                          </Alert>
                        )}

                        {diferecaPrecoAtual !== 0 && (
                          <div className="flex items-center space-x-2">
                            {diferecaPrecoAtual > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={`text-xs ${diferecaPrecoAtual > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diferecaPrecoAtual > 0 ? '+' : ''}{formatCurrency(diferecaPrecoAtual)} vs preço atual
                            </span>
                          </div>
                        )}

                        {/* Resultados */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Margem/unidade:</span>
                            <span className={`font-medium ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(margem)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">% Lucro:</span>
                            <span className={`font-medium ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                              {percentualLucro.toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Faturamento:</span>
                            <span className="font-medium">{formatCurrency(faturamentoTotal)}</span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Lucro Total:</span>
                            <span className={`font-semibold ${lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(lucroTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-center">
                          <Badge 
                            variant={isPrejuizo ? "destructive" : isLucro ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isPrejuizo ? "Prejuízo" : isLucro ? "Lucro" : "Ponto de Equilíbrio"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Comparativo */}
              {cenarios.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparativo de Cenários</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Cenário</th>
                            <th className="text-right py-2">Preço</th>
                            <th className="text-right py-2">Qtd</th>
                            <th className="text-right py-2">Margem</th>
                            <th className="text-right py-2">% Lucro</th>
                            <th className="text-right py-2">Faturamento</th>
                            <th className="text-right py-2">Lucro Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cenarios.map((cenario) => {
                            const margem = calcularMargem(cenario.preco, receita.custo_total);
                            const percentualLucro = calcularPercentualLucro(cenario.preco, receita.custo_total);
                            const lucroTotal = calcularLucroTotal(cenario.preco, receita.custo_total, cenario.quantidade);
                            const faturamentoTotal = calcularFaturamentoTotal(cenario.preco, cenario.quantidade);
                            const isLucro = margem > 0;

                            return (
                              <tr key={cenario.id} className="border-b">
                                <td className="py-2">{cenario.nome}</td>
                                <td className="text-right py-2">{formatCurrency(cenario.preco)}</td>
                                <td className="text-right py-2">{cenario.quantidade}</td>
                                <td className={`text-right py-2 ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(margem)}
                                </td>
                                <td className={`text-right py-2 ${isLucro ? 'text-green-600' : 'text-red-600'}`}>
                                  {percentualLucro.toFixed(1)}%
                                </td>
                                <td className="text-right py-2">{formatCurrency(faturamentoTotal)}</td>
                                <td className={`text-right py-2 font-semibold ${lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(lucroTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}