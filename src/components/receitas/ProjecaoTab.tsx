import { Label } from '@/components/ui/label';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Receita } from '@/types/receitas';
import { Package, Clock, Plus, Trash2 } from 'lucide-react';
import { TiposProdutoModal } from './TiposProdutoModal';
import { MaoObraModal } from './MaoObraModal';
import { useState } from 'react';
import { useTiposProduto } from '@/hooks/useTiposProduto';
import { useAuth } from '@/hooks/useAuth';
import { formatBRL } from '@/lib/formatters';

interface TempMaoObra {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_cargo: string;
  custo_por_hora: number;
  tempo: number;
  unidade_tempo: string;
  valor_total: number;
}

interface ProjecaoTabProps {
  mode?: 'create' | 'edit';
  receita: Receita | any;
  formData: any;
  onFormChange: (field: string, value: any) => void;
  tempMaoObra?: TempMaoObra[];
  onAddMaoObraTemp?: (maoObra: Omit<TempMaoObra, 'id'>) => void;
  onRemoveMaoObraTemp?: (id: string) => void;
}

export const ProjecaoTab = ({ mode = 'edit', receita, formData, onFormChange, tempMaoObra = [], onAddMaoObraTemp, onRemoveMaoObraTemp }: ProjecaoTabProps) => {
  const { user } = useAuth();
  const tiposQuery = useTiposProduto();
  const tiposProduto = tiposQuery.data || [];
  const selectedTipo = tiposProduto.find(tipo => tipo.id === formData.tipo_produto_id);
  const savedTipo = receita?.tipo_produto?.id === formData.tipo_produto_id ? receita.tipo_produto : null;
  const selectedTipoLabel = selectedTipo?.nome || savedTipo?.nome || (formData.tipo_produto_id ? (tiposQuery.isPending ? 'Carregando tipo…' : 'Tipo indisponível') : undefined);
  const [tiposModalOpen, setTiposModalOpen] = useState(false);
  const [maoObraModalOpen, setMaoObraModalOpen] = useState(false);

  const handleRemoveMaoObra = (id: string) => {
    if (onRemoveMaoObraTemp) {
      onRemoveMaoObraTemp(id);
    }
  };

  const handleMaoObraAdded = () => {
    // No-op: the MaoObraModal in temp mode calls onAddMaoObraTemp directly
  };

  const totalMaoObra = tempMaoObra.reduce((sum, mo) => sum + (mo.valor_total || 0), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Seção: Dados do Produto */}
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#0483e4] to-[#2c4dc7]" />
          <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold font-display">Dados do Produto</h3>
          </div>

          {/* Tipo de Produto */}
          <div className="space-y-2">
            <Label htmlFor="tipo_produto_id">Tipo de Produto *</Label>
            <div className="flex gap-2">
              <Select
                value={formData.tipo_produto_id || ''}
                disabled={!user || (tiposQuery.isPending && !tiposProduto.length)}
                onOpenChange={open => { if (open && !tiposQuery.isFetching) void tiposQuery.refetch(); }}
                onValueChange={(value) => onFormChange('tipo_produto_id', value)}
              >
                <SelectTrigger className="flex-1" id="tipo_produto_id" aria-busy={tiposQuery.isFetching} aria-describedby={tiposQuery.isError ? "tipos-produto-error" : undefined}>
                  <SelectValue placeholder={tiposQuery.isPending ? "Carregando tipos…" : "Selecione o tipo"}>{selectedTipoLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent searchable>
                  {tiposQuery.isFetching && !tiposProduto.length && <p role="status" className="px-3 py-4 text-sm text-muted-foreground">Carregando tipos de produto…</p>}
                  {tiposQuery.isError && !tiposQuery.isFetching && !tiposProduto.length && <p className="px-3 py-4 text-sm text-destructive">Não foi possível carregar os tipos. Tente novamente.</p>}
                  {!tiposQuery.isPending && !tiposQuery.isError && !tiposProduto.length && <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum tipo cadastrado. Use o botão + para adicionar.</p>}
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
                aria-label="Gerenciar tipos de produto"
                className="h-[46px] w-[46px] shrink-0"
                disabled={!user}
                onClick={() => setTiposModalOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tiposQuery.isError && <div id="tipos-produto-error" role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
              <span>Não foi possível carregar os tipos de produto.</span>
              <Button type="button" variant="link" className="h-auto p-0" disabled={tiposQuery.isFetching} onClick={() => void tiposQuery.refetch()}>Tentar novamente</Button>
            </div>}
          </div>

          {/* Rendimento */}
          <div className="space-y-2">
            <Label htmlFor="rendimento_valor">Rendimento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <NumericInputPtBr
                id="rendimento_valor"
                tipo="quantidade_continua"
                formatWhileTyping
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
          </CardContent>
        </Card>

        {/* Seção: Tempos de Preparo */}
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#7328b1] to-[#af1188]" />
          <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            <h3 className="font-semibold font-display">Tempos de Preparo</h3>
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

            {tempMaoObra.length > 0 ? (
              <div className="space-y-2">
                {tempMaoObra.map((mo) => (
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

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMaoObraModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Mão de Obra
            </Button>
          </div>
          </CardContent>
        </Card>
      </div>

      {/* Modais */}
      <TiposProdutoModal
        open={tiposModalOpen}
        onOpenChange={setTiposModalOpen}
        onSelect={(tipoId) => {
          onFormChange('tipo_produto_id', tipoId);
        }}
      />

      <MaoObraModal
        receitaId={receita?.id || 'temp'}
        open={maoObraModalOpen}
        onOpenChange={setMaoObraModalOpen}
        onUpdate={handleMaoObraAdded}
        tempMode={true}
        onAddTemp={onAddMaoObraTemp}
      />
    </>
  );
};
