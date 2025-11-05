import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  custo_por_hora: number;
}

interface MaoObraItem {
  id: string;
  funcionario: Funcionario;
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface MaoObraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMaoObraUpdated: (maoObra: MaoObraItem[]) => void;
  existingMaoObra: MaoObraItem[];
}

export function MaoObraModal({ isOpen, onClose, onMaoObraUpdated, existingMaoObra }: MaoObraModalProps) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [maoObra, setMaoObra] = useState<MaoObraItem[]>(existingMaoObra);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState('');
  const [tempo, setTempo] = useState('');
  const [unidadeTempo, setUnidadeTempo] = useState('horas');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      carregarFuncionarios();
      setMaoObra(existingMaoObra);
    }
  }, [isOpen, existingMaoObra]);

  const carregarFuncionarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('folha_pagamento')
        .select('id, nome, cargo, custo_por_hora')
        .eq('ativo', true)
        .eq('tipo_mao_obra', 'direta');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const funcionarioAtual = funcionarios.find(f => f.id === funcionarioSelecionado);

  const adicionarMaoObra = () => {
    if (!funcionarioAtual || !tempo) {
      toast.error('Selecione um funcionário e informe o tempo');
      return;
    }

    const tempoNum = parseFloat(tempo);
    if (tempoNum <= 0) {
      toast.error('Tempo deve ser maior que zero');
      return;
    }

    // Converter tempo para horas baseado na unidade
    let tempoEmHoras = tempoNum;
    if (unidadeTempo === 'minutos') {
      tempoEmHoras = tempoNum / 60;
    } else if (unidadeTempo === 'dias') {
      tempoEmHoras = tempoNum * 8; // Assumindo 8 horas por dia
    }
    
    const valorTotal = funcionarioAtual.custo_por_hora * tempoEmHoras;

    if (editandoId) {
      // Editando item existente
      const novosMaoObra = maoObra.map(item =>
        item.id === editandoId
          ? { ...item, funcionario: funcionarioAtual, tempo: tempoNum, valorTotal, unidadeTempo }
          : item
      );
      setMaoObra(novosMaoObra);
      setEditandoId(null);
    } else {
      // Verificar se funcionário já foi adicionado
      if (maoObra.some(item => item.funcionario.id === funcionarioAtual.id)) {
        toast.error('Funcionário já adicionado');
        return;
      }

      // Adicionando novo item
      const novoItem: MaoObraItem = {
        id: Date.now().toString(),
        funcionario: funcionarioAtual,
        tempo: tempoNum,
        valorTotal,
        unidadeTempo
      };
      setMaoObra([...maoObra, novoItem]);
    }

    // Limpar formulário
    setFuncionarioSelecionado('');
    setTempo('');
    setUnidadeTempo('horas');
  };

  const editarMaoObra = (item: MaoObraItem) => {
    setFuncionarioSelecionado(item.funcionario.id);
    setTempo(item.tempo.toString());
    setUnidadeTempo(item.unidadeTempo || 'horas');
    setEditandoId(item.id);
  };

  const removerMaoObra = (id: string) => {
    setMaoObra(maoObra.filter(item => item.id !== id));
  };

  const cancelarEdicao = () => {
    setFuncionarioSelecionado('');
    setTempo('');
    setUnidadeTempo('horas');
    setEditandoId(null);
  };

  const salvar = () => {
    onMaoObraUpdated(maoObra);
    onClose();
  };

  const valorTotalGeral = maoObra.reduce((total, item) => total + item.valorTotal, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gerenciar Mão de Obra Direta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulário de Adição/Edição */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-2">
                  <Label>Funcionário</Label>
                  <Select value={funcionarioSelecionado} onValueChange={setFuncionarioSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Carregando..." : "Selecione o funcionário"} />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionarios.map((funcionario) => (
                        <SelectItem key={funcionario.id} value={funcionario.id}>
                          {funcionario.nome} - {funcionario.cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tempo</Label>
                  <NumericInputPtBr
                    tipo="quantidade_continua"
                    min={0}
                    value={parseFloat(tempo) || 0}
                    onChange={(valor) => setTempo(valor.toString())}
                  />
                </div>

                <div>
                  <Label>Unidade</Label>
                  <Select value={unidadeTempo} onValueChange={setUnidadeTempo}>
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

                <div>
                  <Label>Valor Total</Label>
                  <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
                    {funcionarioAtual && tempo ? (() => {
                      let tempoEmHoras = parseFloat(tempo || '0');
                      if (unidadeTempo === 'minutos') {
                        tempoEmHoras = tempoEmHoras / 60;
                      } else if (unidadeTempo === 'dias') {
                        tempoEmHoras = tempoEmHoras * 8;
                      }
                      return `R$ ${(funcionarioAtual.custo_por_hora * tempoEmHoras).toFixed(2)}`;
                    })() : 'R$ 0,00'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={adicionarMaoObra} disabled={!funcionarioAtual || !tempo}>
                    {editandoId ? 'Salvar' : <Plus className="h-4 w-4" />}
                  </Button>
                  {editandoId && (
                    <Button variant="outline" onClick={cancelarEdicao}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {funcionarioAtual && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <strong>Cargo:</strong> {funcionarioAtual.cargo} | <strong>Valor/Hora:</strong> R$ {funcionarioAtual.custo_por_hora.toFixed(2)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Mão de Obra Adicionada */}
          {maoObra.length > 0 && (
            <div>
              <h4 className="font-medium mb-3">Mão de Obra Adicionada</h4>
              <div className="space-y-2">
                {maoObra.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.funcionario.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.funcionario.cargo} • {item.tempo} {item.unidadeTempo || 'horas'} • R$ {item.funcionario.custo_por_hora.toFixed(2)}/h
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="font-medium">R$ {item.valorTotal.toFixed(2)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editarMaoObra(item)}
                        disabled={!!editandoId}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerMaoObra(item.id)}
                        disabled={!!editandoId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total da Mão de Obra:</span>
                  <span className="text-lg font-bold">R$ {valorTotalGeral.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={salvar}>
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}