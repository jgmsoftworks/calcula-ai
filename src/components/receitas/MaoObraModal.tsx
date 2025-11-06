import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Clock } from 'lucide-react';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  custo_por_hora: number;
  horas_por_dia: number;
}

interface MaoObra {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_cargo: string;
  tempo: number;
  unidade_tempo: string;
  valor_total: number;
}

interface MaoObraModalProps {
  receitaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const MaoObraModal = ({ receitaId, open, onOpenChange, onUpdate }: MaoObraModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [maoObraList, setMaoObraList] = useState<MaoObra[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedFuncionario, setSelectedFuncionario] = useState<string>('');
  const [tempo, setTempo] = useState<number>(0);
  const [unidadeTempo, setUnidadeTempo] = useState<string>('horas');
  const [valorTotal, setValorTotal] = useState<number>(0);

  useEffect(() => {
    if (open && user) {
      fetchFuncionarios();
      fetchMaoObra();
    }
  }, [open, user, receitaId]);

  useEffect(() => {
    calcularValorTotal();
  }, [selectedFuncionario, tempo, unidadeTempo]);

  const fetchFuncionarios = async () => {
    if (!user) return;

    try {
    const { data, error } = await supabase
      .from('folha_pagamento')
      .select('*')
      .eq('user_id', user.id)
      .eq('tipo_mao_obra', 'direta')
      .eq('ativo', true)
      .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os funcionários.',
        variant: 'destructive',
      });
    }
  };

  const fetchMaoObra = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('receita_mao_obra')
        .select('*')
        .eq('receita_id', receitaId);

      if (error) throw error;
      setMaoObraList(data || []);
    } catch (error) {
      console.error('Erro ao buscar mão de obra:', error);
    }
  };

  const calcularValorTotal = () => {
    if (!selectedFuncionario || tempo <= 0) {
      setValorTotal(0);
      return;
    }

    const funcionario = funcionarios.find(f => f.id === selectedFuncionario);
    if (!funcionario) {
      setValorTotal(0);
      return;
    }

    let horas = 0;
    if (unidadeTempo === 'minutos') {
      horas = tempo / 60;
    } else if (unidadeTempo === 'horas') {
      horas = tempo;
    } else if (unidadeTempo === 'dias') {
      horas = tempo * (funcionario.horas_por_dia || 8);
    }

    const total = funcionario.custo_por_hora * horas;
    setValorTotal(total);
  };

  const handleAdd = async () => {
    if (!selectedFuncionario || tempo <= 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione um funcionário e informe o tempo.',
        variant: 'destructive',
      });
      return;
    }

    const funcionario = funcionarios.find(f => f.id === selectedFuncionario);
    if (!funcionario) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receita_mao_obra')
        .insert([{
          receita_id: receitaId,
          funcionario_id: selectedFuncionario,
          funcionario_nome: funcionario.nome,
          funcionario_cargo: funcionario.cargo,
          custo_por_hora: funcionario.custo_por_hora,
          tempo: tempo,
          unidade_tempo: unidadeTempo,
          valor_total: valorTotal,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Mão de obra adicionada com sucesso.',
      });

      setMaoObraList([...maoObraList, data]);
      
      // Resetar form
      setSelectedFuncionario('');
      setTempo(0);
      setUnidadeTempo('horas');
      setValorTotal(0);
      
      onUpdate();
    } catch (error) {
      console.error('Erro ao adicionar mão de obra:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a mão de obra.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('receita_mao_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Mão de obra removida com sucesso.',
      });

      setMaoObraList(maoObraList.filter(mo => mo.id !== id));
      onUpdate();
    } catch (error) {
      console.error('Erro ao remover mão de obra:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a mão de obra.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalGeral = maoObraList.reduce((sum, mo) => sum + mo.valor_total, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gerenciar Mão de Obra Direta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário de adição */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="funcionario">Funcionário *</Label>
              <Select
                value={selectedFuncionario}
                onValueChange={setSelectedFuncionario}
              >
                <SelectTrigger id="funcionario">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum funcionário com mão de obra direta cadastrado
                    </div>
                  ) : (
                    funcionarios.map((func) => (
                      <SelectItem key={func.id} value={func.id}>
                        {func.nome} - {func.cargo}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tempo">Tempo *</Label>
                <NumericInputPtBr
                  id="tempo"
                  tipo="quantidade_continua"
                  value={tempo}
                  onChange={setTempo}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select value={unidadeTempo} onValueChange={setUnidadeTempo}>
                  <SelectTrigger id="unidade">
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

            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="text-muted-foreground">Valor Total</Label>
                <p className="text-2xl font-bold text-primary">
                  R$ {valorTotal.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <Button
                onClick={handleAdd}
                disabled={loading || !selectedFuncionario || tempo <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista de mão de obra adicionada */}
          <div className="space-y-3">
            <Label>Mão de Obra Adicionada</Label>
            {maoObraList.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
                Nenhuma mão de obra adicionada
              </div>
            ) : (
              <>
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
                          R$ {mo.valor_total.toFixed(2).replace('.', ',')}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(mo.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t font-bold">
                  <span>Total:</span>
                  <span className="text-xl text-primary">
                    R$ {totalGeral.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
