import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface ModoUsoTabProps {
  totalEmbalagem: number;
  custoTotal: number;
  custoUnitario: number;
  unidadeCompra: string;
  onConversaoChange: (conversao: {
    unidade_compra: string;
    quantidade_por_unidade: number;
    unidade_uso_receitas: string;
    custo_unitario_uso: number;
    quantidade_unidade_uso: number;
  }) => void;
  initialData?: {
    unidade_uso_receitas: string;
    custo_unitario_uso: number;
    quantidade_unidade_uso: number;
  } | null;
}

export const ModoUsoTab = ({
  totalEmbalagem,
  custoTotal,
  custoUnitario,
  unidadeCompra,
  onConversaoChange,
  initialData
}: ModoUsoTabProps) => {
  const [unidadeUsoReceitas, setUnidadeUsoReceitas] = useState(initialData?.unidade_uso_receitas || unidadeCompra);
  const [quantidadeUnidadeUso, setQuantidadeUnidadeUso] = useState(initialData?.quantidade_unidade_uso || 1);
  const [custoUnitarioUso, setCustoUnitarioUso] = useState(0);

  // Atualizar estado quando initialData mudar (ao carregar produto existente)
  useEffect(() => {
    if (initialData) {
      setUnidadeUsoReceitas(initialData.unidade_uso_receitas || unidadeCompra);
      setQuantidadeUnidadeUso(initialData.quantidade_unidade_uso || 1);
    }
  }, [initialData, unidadeCompra]);

  // Verificar se as unidades são diferentes
  const unidadesDiferentes = unidadeUsoReceitas !== unidadeCompra;

  // Calcular custo unitário de uso sempre que os valores mudarem
  useEffect(() => {
    let custo = 0;
    
    if (totalEmbalagem > 0) {
      if (unidadesDiferentes && quantidadeUnidadeUso > 0) {
        // Custo = Total / (Quantidade por Embalagem × Quantidade da Unidade)
        custo = custoTotal / (totalEmbalagem * quantidadeUnidadeUso);
      } else {
        // Quando as unidades são iguais, divide apenas pela quantidade
        custo = custoTotal / totalEmbalagem;
      }
    }
    
    setCustoUnitarioUso(custo);
    
    // Notificar componente pai sobre a mudança
    onConversaoChange({
      unidade_compra: unidadeCompra,
      quantidade_por_unidade: totalEmbalagem,
      unidade_uso_receitas: unidadeUsoReceitas,
      custo_unitario_uso: custo,
      quantidade_unidade_uso: unidadesDiferentes ? quantidadeUnidadeUso : 1
    });
  }, [totalEmbalagem, custoTotal, unidadeCompra, unidadeUsoReceitas, quantidadeUnidadeUso, unidadesDiferentes]);

  return (
    <div className="space-y-6">
      <Alert className="bg-primary/5 border-primary/20">
        <InfoIcon className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-muted-foreground">
          <strong>Modo de Uso:</strong> Defina como este produto será usado nas receitas. 
          Por exemplo, se você compra em "fardo", mas usa em "pacotes" nas receitas.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-background/50 rounded-lg border">
        {/* Seção de Compra (Dados da aba Estoque e Custos) */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold text-primary uppercase">Dados de Compra</h4>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Unidade de Compra</Label>
            <Input
              value={unidadeCompra}
              readOnly
              className="h-10 bg-muted text-center font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quantidade por Unidade</Label>
            <Input
              value={totalEmbalagem}
              readOnly
              className="h-10 bg-muted text-center font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custo Total</Label>
            <Input
              value={custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              readOnly
              className="h-10 bg-muted text-center font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Custo Unitário (Compra)</Label>
            <Input
              value={custoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              readOnly
              className="h-10 bg-muted text-center font-medium"
            />
          </div>
        </div>

        {/* Seção de Uso nas Receitas */}
        <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <h4 className="text-sm font-semibold text-primary uppercase">Para Uso nas Receitas</h4>
          
          <div className="space-y-2">
            <Label htmlFor="unidade_uso_receitas" className="text-sm font-medium">
              Unidade de Uso nas Receitas *
            </Label>
            <Select 
              value={unidadeUsoReceitas} 
              onValueChange={setUnidadeUsoReceitas}
            >
              <SelectTrigger className="h-12 border-2 border-primary/30 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="un">Unidade (un.)</SelectItem>
                <SelectItem value="g">Gramas (g)</SelectItem>
                <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                <SelectItem value="ml">Mililitros (ml)</SelectItem>
                <SelectItem value="l">Litros (l)</SelectItem>
                <SelectItem value="cx">Caixas (cx)</SelectItem>
                <SelectItem value="pct">Pacotes (pct)</SelectItem>
                <SelectItem value="fardo">Fardo</SelectItem>
                <SelectItem value="m">Metro (m)</SelectItem>
                <SelectItem value="cm">Centímetro (cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo condicional: quantidade da unidade de uso */}
          {unidadesDiferentes && (
            <div className="space-y-2">
              <Label htmlFor="quantidade_unidade_uso" className="text-sm font-medium">
                Quantas {unidadeUsoReceitas} tem em cada {unidadeCompra}? *
              </Label>
              <Input
                id="quantidade_unidade_uso"
                type="number"
                value={quantidadeUnidadeUso}
                onChange={(e) => setQuantidadeUnidadeUso(Number(e.target.value))}
                className="h-12 border-2 border-primary/30 focus:border-primary"
                min="0.01"
                step="0.01"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ex: Se cada {unidadeCompra} contém 500{unidadeUsoReceitas}, digite 500
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Custo por Unidade de Uso</Label>
            <div className="h-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {custoUnitarioUso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Este será o custo usado nas receitas por <strong>{unidadeUsoReceitas}</strong>
            </p>
          </div>

          <div className="p-3 bg-background rounded border border-primary/20">
            <p className="text-xs text-muted-foreground">
              {unidadesDiferentes ? (
                <>
                  <strong>Exemplo:</strong> Você compra 1 {unidadeCompra} com {totalEmbalagem} unidades, 
                  cada uma contendo {quantidadeUnidadeUso} {unidadeUsoReceitas}, 
                  por {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. 
                  Cada {unidadeUsoReceitas} custará {custoUnitarioUso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} nas receitas.
                </>
              ) : (
                <>
                  <strong>Exemplo:</strong> Você compra 1 {unidadeCompra} com {totalEmbalagem} {unidadeUsoReceitas} 
                  por {custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. 
                  Cada {unidadeUsoReceitas} custará {custoUnitarioUso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} nas receitas.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
