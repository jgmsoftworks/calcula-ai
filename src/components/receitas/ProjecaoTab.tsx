import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReceitaCompleta } from '@/types/receitas';

interface ProjecaoTabProps {
  receita: ReceitaCompleta;
  formData: any;
  onFormChange: (field: string, value: any) => void;
}

export function ProjecaoTab({ receita, formData, onFormChange }: ProjecaoTabProps) {
  const [custoTotal, setCustoTotal] = useState(0);

  useEffect(() => {
    const calcularCustoTotal = () => {
      const custoIngredientes = receita.ingredientes.reduce((sum, i) => sum + i.custo_total, 0);
      const custoEmbalagens = receita.embalagens.reduce((sum, e) => sum + e.custo_total, 0);
      const custoMaoObra = receita.mao_obra.reduce((sum, m) => sum + m.valor_total, 0);
      const custoSubReceitas = receita.sub_receitas.reduce((sum, s) => sum + s.custo_total, 0);
      return custoIngredientes + custoEmbalagens + custoMaoObra + custoSubReceitas;
    };

    setCustoTotal(calcularCustoTotal());
  }, [receita]);

  const custoGrama = formData.peso_unitario > 0 ? custoTotal / formData.peso_unitario : 0;
  const precoKg = custoGrama * 1000;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="peso_unitario">Peso Unitário (g)</Label>
          <Input
            id="peso_unitario"
            type="number"
            value={formData.peso_unitario || ''}
            onChange={(e) => onFormChange('peso_unitario', Number(e.target.value))}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rendimento_valor">Rendimento</Label>
          <div className="flex gap-2">
            <Input
              id="rendimento_valor"
              type="number"
              value={formData.rendimento_valor || ''}
              onChange={(e) => onFormChange('rendimento_valor', Number(e.target.value))}
              placeholder="0"
              className="flex-1"
              min="0"
              step="0.01"
            />
            <Input
              value={formData.rendimento_unidade || ''}
              onChange={(e) => onFormChange('rendimento_unidade', e.target.value)}
              placeholder="un"
              className="w-24"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tempo_preparo_total">Tempo Total (min)</Label>
          <Input
            id="tempo_preparo_total"
            type="number"
            value={formData.tempo_preparo_total || 0}
            onChange={(e) => onFormChange('tempo_preparo_total', Number(e.target.value))}
            placeholder="0"
            min="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tempo_preparo_mao_obra">Tempo Mão de Obra (min)</Label>
          <Input
            id="tempo_preparo_mao_obra"
            type="number"
            value={formData.tempo_preparo_mao_obra || 0}
            onChange={(e) => onFormChange('tempo_preparo_mao_obra', Number(e.target.value))}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes || ''}
          onChange={(e) => onFormChange('observacoes', e.target.value)}
          placeholder="Observações sobre a receita..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              R$ {custoTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo por Grama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              R$ {custoGrama.toFixed(4)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preço por KG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              R$ {precoKg.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
