import { useState, useEffect } from 'react';
import { Clock, Package, TrendingUp, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TipoProdutoModal } from './TipoProdutoModal';
import { MaoObraModal } from './MaoObraModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface ProjecaoStepProps {
  receitaId: string | null;
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
  tipoProduto: string;
  onMaoObraChange: (maoObra: MaoObraItem[]) => void;
  onRendimentoChange: (rendimentoValor: string, rendimentoUnidade: string) => void;
  onTipoProdutoChange: (tipoProduto: string) => void;
}

export function ProjecaoStep({ 
  receitaId,
  maoObra, 
  rendimentoValor, 
  rendimentoUnidade, 
  tipoProduto,
  onMaoObraChange, 
  onRendimentoChange,
  onTipoProdutoChange
}: ProjecaoStepProps) {
  const [tempoPreparoTotal, setTempoPreparoTotal] = useState(0);
  const [tempoPreparoUnidade, setTempoPreparoUnidade] = useState('minutos');
  const [tiposProduto, setTiposProduto] = useState<{ id: string; nome: string }[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalMaoObraAberto, setModalMaoObraAberto] = useState(false);
  const { user } = useAuth();

  // Carregar tipos de produto do banco
  useEffect(() => {
    const loadTipos = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('tipos_produto')
          .select('id, nome')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        setTiposProduto(data || []);
      } catch (error) {
        console.error('Erro ao carregar tipos de produto:', error);
      }
    };

    loadTipos();
  }, [user?.id]);

  // Mock data para cálculos
  const custoIngredientes = 45.20;
  const custoSubReceitas = 12.50;
  const custoEmbalagens = 3.80;
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens;

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'quilo', label: 'Quilo (K)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  const unidadesTempo = [
    { value: 'minutos', label: 'Minutos' },
    { value: 'horas', label: 'Horas' },
    { value: 'dias', label: 'Dias' },
  ];

  const adicionarTipoProduto = (novoTipo: { id: string; nome: string; descricao?: string }) => {
    setTiposProduto([...tiposProduto, novoTipo]);
  };

  const atualizarTiposProduto = (novostipos: { id: string; nome: string }[]) => {
    setTiposProduto(novostipos);
  };

  const atualizarMaoObra = (novaMaoObra: MaoObraItem[]) => {
    onMaoObraChange(novaMaoObra);
  };

  const tempoTotalMaoObra = maoObra.reduce((total, item) => total + item.tempo, 0);
  const valorTotalMaoObra = maoObra.reduce((total, item) => total + item.valorTotal, 0);

  const getUnidadeAbreviacao = (unidade: string = 'horas') => {
    switch (unidade) {
      case 'minutos': return 'm';
      case 'horas': return 'h';
      case 'dias': return 'd';
      default: return 'h';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Projeção da Receita</h3>
          <p className="text-muted-foreground">Configure os dados finais e veja o resumo dos custos</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">Última Atualização</p>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4 lg:col-span-2">
          {/* Dados do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dados do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="tipo-produto">Tipo de Produto *</Label>
                <div className="flex gap-2">
                  <Select value={tipoProduto} onValueChange={onTipoProdutoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={tiposProduto.length === 0 ? "Nenhum tipo cadastrado - adicione um tipo" : "Selecione o tipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposProduto.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.nome}>
                          {tipo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2"
                    onClick={() => setModalAberto(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="rendimento">Rendimento *</Label>
                <div className="flex gap-2">
                  <Input
                    id="rendimento-valor"
                    placeholder="Ex: 8, 500, 12"
                    value={rendimentoValor}
                    onChange={(e) => onRendimentoChange(e.target.value, rendimentoUnidade)}
                    className="flex-1"
                  />
                  <Select value={rendimentoUnidade} onValueChange={(value) => onRendimentoChange(rendimentoValor, value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesRendimento.map((unidade) => (
                        <SelectItem key={unidade.value} value={unidade.value}>
                          {unidade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Tempo de Preparo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempos de Preparo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Tempo de Preparo Total</Label>
                <div className="flex gap-2">
                  <NumericInputPtBr
                    tipo="quantidade_un"
                    min={0}
                    value={tempoPreparoTotal}
                    onChange={(valor) => setTempoPreparoTotal(valor)}
                    className="flex-1"
                  />
                  <Select value={tempoPreparoUnidade} onValueChange={setTempoPreparoUnidade}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesTempo.map((unidade) => (
                        <SelectItem key={unidade.value} value={unidade.value}>
                          {unidade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="text-sm">Tempo de Mão de Obra Direta</Label>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => setModalMaoObraAberto(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Mão de Obra
                  </Button>
                  
                  {maoObra.length > 0 && (
                    <div className="space-y-2">
                      {maoObra.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <div>
                            <span className="font-medium">{item.funcionario.nome}</span>
                            <span className="text-muted-foreground ml-2">({item.funcionario.cargo})</span>
                          </div>
                          <div className="text-right">
                            <div>{item.tempo}{getUnidadeAbreviacao(item.unidadeTempo)}</div>
                            <div className="text-muted-foreground">R$ {item.valorTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm font-medium">Total:</span>
                        <div className="text-right">
                          <div className="text-sm">
                            {maoObra.map((item, index) => (
                              <span key={item.id}>
                                {item.tempo}{getUnidadeAbreviacao(item.unidadeTempo)}
                                {index < maoObra.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                          <div className="text-sm font-medium">R$ {valorTotalMaoObra.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Tipos de Produto */}
      <TipoProdutoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onTipoCreated={adicionarTipoProduto}
        existingTipos={tiposProduto}
      />

      {/* Modal de Mão de Obra */}
      <MaoObraModal
        isOpen={modalMaoObraAberto}
        onClose={() => setModalMaoObraAberto(false)}
        onMaoObraUpdated={atualizarMaoObra}
        existingMaoObra={maoObra}
      />
    </div>
  );
}