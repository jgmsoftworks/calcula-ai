import { useState } from 'react';
import { TrendingUp, DollarSign, Weight, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface MaoObraItem {
  id: string;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
    custo_por_hora: number;
  };
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface ReceitaData {
  ingredientes: Ingrediente[];
  subReceitas: SubReceita[];
  embalagens: Embalagem[];
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
}

interface PrecificacaoStepProps {
  receitaData: ReceitaData;
}

export function PrecificacaoStep({ receitaData }: PrecificacaoStepProps) {
  const [precoVenda, setPrecoVenda] = useState('');
  const [pesoUnitario, setPesoUnitario] = useState('');
  
  // Calculate real costs from the recipe data
  const custoIngredientes = receitaData.ingredientes.reduce((total, item) => total + item.custo_total, 0);
  const custoSubReceitas = receitaData.subReceitas.reduce((total, item) => total + item.custo_total, 0);
  const custoEmbalagens = receitaData.embalagens.reduce((total, item) => total + item.custo_total, 0);
  const valorTotalMaoObra = receitaData.maoObra.reduce((total, item) => total + item.valorTotal, 0);
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens + valorTotalMaoObra;
  
  const { rendimentoValor, rendimentoUnidade } = receitaData;

  // Calculate price per KG and unit cost
  const custoUnitario = custoTotal / (parseFloat(rendimentoValor) || 1);
  const precoKg = (parseFloat(precoVenda) && parseFloat(pesoUnitario)) 
    ? (parseFloat(precoVenda) / (parseFloat(pesoUnitario) / 1000)).toFixed(2)
    : '0,00';

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'quilo', label: 'Quilo (KG)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Resumo de Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
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
            <div className="pt-3 border-t">
              <div className="space-y-1">
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

      {/* Pricing Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Preço de Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço de Venda (R$/un.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="R$ 0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        {/* Peso Unitário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Weight className="h-4 w-4" />
              Peso Unitário (g)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="number"
              step="0.1"
              min="0"
              placeholder="Ex: 500"
              value={pesoUnitario}
              onChange={(e) => setPesoUnitario(e.target.value)}
              className="text-lg font-medium"
            />
          </CardContent>
        </Card>

        {/* Preço por KG */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                R$ {precoKg}
              </p>
            </div>
            <hr />
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Custo Unitário</Label>
              <p className="text-lg font-medium">
                R$ {custoUnitario.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}