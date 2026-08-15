import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RotuloNutricional } from '@/hooks/useEstoque';

interface RotuloNutricionalFormProps {
  value: RotuloNutricional | null | undefined;
  onChange: (value: RotuloNutricional | null) => void;
}

const emptyRotulo: RotuloNutricional = {
  porcao_quantidade: null,
  porcao_unidade: 'g',
  medida_caseira: null,
  porcoes_por_embalagem: null,
  valor_energetico_kcal: null,
  carboidratos_g: null,
  acucares_totais_g: null,
  acucares_adicionados_g: null,
  proteinas_g: null,
  gorduras_totais_g: null,
  gorduras_saturadas_g: null,
  gorduras_trans_g: null,
  fibras_alimentares_g: null,
  sodio_mg: null,
};

const nutrientes: Array<{ key: keyof RotuloNutricional; label: string; unidade: string }> = [
  { key: 'valor_energetico_kcal', label: 'Valor energético', unidade: 'kcal' },
  { key: 'carboidratos_g', label: 'Carboidratos', unidade: 'g' },
  { key: 'acucares_totais_g', label: 'Açúcares totais', unidade: 'g' },
  { key: 'acucares_adicionados_g', label: 'Açúcares adicionados', unidade: 'g' },
  { key: 'proteinas_g', label: 'Proteínas', unidade: 'g' },
  { key: 'gorduras_totais_g', label: 'Gorduras totais', unidade: 'g' },
  { key: 'gorduras_saturadas_g', label: 'Gorduras saturadas', unidade: 'g' },
  { key: 'gorduras_trans_g', label: 'Gorduras trans', unidade: 'g' },
  { key: 'fibras_alimentares_g', label: 'Fibras alimentares', unidade: 'g' },
  { key: 'sodio_mg', label: 'Sódio', unidade: 'mg' },
];

export function RotuloNutricionalForm({ value, onChange }: RotuloNutricionalFormProps) {
  const rotulo = { ...emptyRotulo, ...value };

  const update = (key: keyof RotuloNutricional, nextValue: string | number | null) => {
    onChange({ ...rotulo, [key]: nextValue });
  };

  return (
    <div className="space-y-5 mt-4">
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Cadastre os valores referentes a uma porção do produto. Os campos são opcionais e podem ser preenchidos aos poucos.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Quantidade da porção</Label>
          <NumericInputPtBr
            tipo="quantidade_continua"
            min={0}
            value={rotulo.porcao_quantidade || 0}
            onChange={(nextValue) => update('porcao_quantidade', nextValue || null)}
            placeholder="Ex: 30"
          />
        </div>

        <div>
          <Label>Unidade da porção</Label>
          <Select value={rotulo.porcao_unidade || 'g'} onValueChange={(nextValue) => update('porcao_unidade', nextValue)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="g">Gramas (g)</SelectItem>
              <SelectItem value="ml">Mililitros (ml)</SelectItem>
              <SelectItem value="un">Unidade (un)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Medida caseira</Label>
          <Input
            value={rotulo.medida_caseira || ''}
            onChange={(event) => update('medida_caseira', event.target.value || null)}
            placeholder="Ex: 2 colheres de sopa"
          />
        </div>

        <div>
          <Label>Porções por embalagem</Label>
          <NumericInputPtBr
            tipo="quantidade_continua"
            min={0}
            value={rotulo.porcoes_por_embalagem || 0}
            onChange={(nextValue) => update('porcoes_por_embalagem', nextValue || null)}
            placeholder="Ex: 5"
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Quantidade por porção</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nutrientes.map((nutriente) => (
            <div key={nutriente.key}>
              <Label>{nutriente.label}</Label>
              <div className="relative">
                <NumericInputPtBr
                  tipo="quantidade_continua"
                  min={0}
                  value={(rotulo[nutriente.key] as number | null) || 0}
                  onChange={(nextValue) => update(nutriente.key, nextValue || null)}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  {nutriente.unidade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
