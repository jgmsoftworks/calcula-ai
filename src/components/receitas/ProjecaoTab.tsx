import { Label } from '@/components/ui/label';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Receita } from '@/types/receitas';
import { Package, Clock, Plus, Trash2 } from 'lucide-react';
import { TiposProdutoModal } from './TiposProdutoModal';
import { MaoObraModal } from './MaoObraModal';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatBRL, formatNumber } from '@/lib/formatters';

interface ProjecaoTabProps {
  mode?: 'create' | 'edit';
  receita: Receita | any;
  formData: any;
  onFormChange: (field: string, value: any) => void;
}

export const ProjecaoTab = ({ mode = 'edit', receita, formData, onFormChange }: ProjecaoTabProps) => {
  const { user } = useAuth();
  const [tiposProduto, setTiposProduto] = useState<any[]>([]);
  const [tiposModalOpen, setTiposModalOpen] = useState(false);
  const [maoObraModalOpen, setMaoObraModalOpen] = useState(false);
  const [maoObraList, setMaoObraList] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTiposProduto();
      
      // Só buscar mão de obra em modo edição com receita válida
      if (mode === 'edit' && receita?.id) {
        fetchMaoObra();
      }
    }
  }, [user, receita?.id, mode]);

  const fetchTiposProduto = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tipos_produto')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');

      if (error) throw error;
      setTiposProduto(data || []);
    } catch (error) {
      console.error('Erro ao buscar tipos de produto:', error);
    }
  };

  const fetchMaoObra = async () => {
    if (!user || !receita?.id) return;

    try {
      const { data, error } = await supabase
        .from('receita_mao_obra')
        .select('*')
        .eq('receita_id', receita.id);

      if (error) throw error;
      setMaoObraList(data || []);
    } catch (error) {
      console.error('Erro ao buscar mão de obra:', error);
    }
  };

  const handleRemoveMaoObra = async (id: string) => {
    try {
      const { error } = await supabase
        .from('receita_mao_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMaoObra();
    } catch (error) {
      console.error('Erro ao remover mão de obra:', error);
    }
  };

  const totalMaoObra = maoObraList.reduce((sum, mo) => sum + (mo.valor_total || 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Seção: Dados do Produto */}
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="font-semibold">Dados do Produto</h3>
          </div>

          {/* Tipo de Produto */}
          <div className="space-y-2">
            <Label htmlFor="tipo_produto_id">Tipo de Produto *</Label>
            <div className="flex gap-2">
              <Select
                value={formData.tipo_produto_id || ''}
                onValueChange={(value) => onFormChange('tipo_produto_id', value)}
              >
                <SelectTrigger className="flex-1" id="tipo_produto_id">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposProduto.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTiposModalOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rendimento */}
          <div className="space-y-2">
            <Label htmlFor="rendimento_valor">Rendimento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <NumericInputPtBr
                id="rendimento_valor"
                tipo="quantidade_continua"
                value={formData.rendimento_valor || 0}
                onChange={(value) => onFormChange('rendimento_valor', value)}
                placeholder="0"
              />
              <Select
                value={formData.rendimento_unidade || ''}
                onValueChange={(value) => onFormChange('rendimento_unidade', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grama (g)">Grama (g)</SelectItem>
                  <SelectItem value="Quilo (k)">Quilo (k)</SelectItem>
                  <SelectItem value="Litro (l)">Litro (l)</SelectItem>
                  <SelectItem value="Metro (m)">Metro (m)</SelectItem>
                  <SelectItem value="Unidade (un)">Unidade (un)</SelectItem>
                  <SelectItem value="Mililitro (ml)">Mililitro (ml)</SelectItem>
                  <SelectItem value="Centímetro (cm)">Centímetro (cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Seção: Tempos de Preparo */}
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h3 className="font-semibold">Tempos de Preparo</h3>
          </div>

          {/* Tempo de Preparo Total */}
          <div className="space-y-2">
            <Label htmlFor="tempo_preparo_total">Tempo de Preparo Total</Label>
            <div className="grid grid-cols-2 gap-2">
              <NumericInputPtBr
                id="tempo_preparo_total"
                tipo="quantidade_continua"
                value={formData.tempo_preparo_total || 0}
                onChange={(value) => onFormChange('tempo_preparo_total', value)}
                placeholder="0"
              />
              <Select
                value={formData.tempo_preparo_unidade || 'minutos'}
                onValueChange={(value) => onFormChange('tempo_preparo_unidade', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutos">Minutos</SelectItem>
                  <SelectItem value="horas">Horas</SelectItem>
                  <SelectItem value="dias">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tempo de Mão de Obra Direta */}
          <div className="space-y-3">
            <Label>Tempo de Mão de Obra Direta</Label>

            {mode === 'create' ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                <p>Cadastro de mão de obra fica disponível após salvar a receita pela primeira vez.</p>
              </div>
            ) : maoObraList.length > 0 ? (
              <div className="space-y-2">
                {maoObraList.map((mo) => (
                  <div
                    key={mo.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{mo.funcionario_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {mo.funcionario_cargo} • {mo.tempo} {mo.unidade_tempo}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">
                        R$ {formatBRL(mo.valor_total || 0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMaoObra(mo.id)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    R$ {formatBRL(totalMaoObra)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                Nenhuma mão de obra adicionada
              </div>
            )}

            {mode === 'edit' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMaoObraModalOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Mão de Obra
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <TiposProdutoModal
        open={tiposModalOpen}
        onOpenChange={setTiposModalOpen}
        onSelect={(tipoId) => {
          onFormChange('tipo_produto_id', tipoId);
          fetchTiposProduto();
        }}
      />

      {mode === 'edit' && receita?.id && (
        <MaoObraModal
          receitaId={receita.id}
          open={maoObraModalOpen}
          onOpenChange={setMaoObraModalOpen}
          onUpdate={fetchMaoObra}
        />
      )}
    </>
  );
};
