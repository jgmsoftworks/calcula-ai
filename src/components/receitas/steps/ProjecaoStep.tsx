import { useState } from 'react';
import { Clock, Package, TrendingUp, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TipoProdutoModal } from './TipoProdutoModal';

export function ProjecaoStep() {
  const [tipoProduto, setTipoProduto] = useState('');
  const [rendimentoValor, setRendimentoValor] = useState('');
  const [rendimentoUnidade, setRendimentoUnidade] = useState('unidade');
  const [tempoPreparoTotal, setTempoPreparoTotal] = useState(0);
  const [tempoPreparoMaoObra, setTempoPreparoMaoObra] = useState(0);
  const [tiposProduto, setTiposProduto] = useState<{ id: string; nome: string }[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  // Mock data para cálculos
  const custoIngredientes = 45.20;
  const custoSubReceitas = 12.50;
  const custoEmbalagens = 3.80;
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens;

  const unidadesRendimento = [
    { value: 'unidade', label: 'Unidade (UN)' },
    { value: 'grama', label: 'Grama (G)' },
    { value: 'quilo', label: 'Quilo (KG)' },
    { value: 'litro', label: 'Litro (L)' },
    { value: 'mililitro', label: 'Mililitro (ML)' },
  ];

  const adicionarTipoProduto = (novoTipo: { id: string; nome: string }) => {
    setTiposProduto([...tiposProduto, novoTipo]);
  };

  const atualizarTiposProduto = (novostipos: { id: string; nome: string }[]) => {
    setTiposProduto(novostipos);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Dados do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dados do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tipo-produto">Tipo de Produto *</Label>
                <div className="flex gap-2">
                  <Select value={tipoProduto} onValueChange={setTipoProduto}>
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
                    onChange={(e) => setRendimentoValor(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={rendimentoUnidade} onValueChange={setRendimentoUnidade}>
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
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tempo-total" className="text-sm">Tempo Total (minutos)</Label>
                <Input
                  id="tempo-total"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={tempoPreparoTotal || ''}
                  onChange={(e) => setTempoPreparoTotal(parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="tempo-mao-obra" className="text-sm">Tempo de Mão de Obra (minutos)</Label>
                <Input
                  id="tempo-mao-obra"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={tempoPreparoMaoObra || ''}
                  onChange={(e) => setTempoPreparoMaoObra(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo efetivo de trabalho manual
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
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
              
              <hr className="my-3" />
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Custo Total</span>
                <Badge className="text-base font-bold">R$ {custoTotal.toFixed(2)}</Badge>
              </div>
            </div>

            {rendimentoValor && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
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

            {(tempoPreparoTotal > 0 || tempoPreparoMaoObra > 0) && (
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-2 block">Tempos Configurados</Label>
                <div className="space-y-1">
                  {tempoPreparoTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tempo Total:</span>
                      <span>{tempoPreparoTotal} min</span>
                    </div>
                  )}
                  {tempoPreparoMaoObra > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mão de Obra:</span>
                      <span>{tempoPreparoMaoObra} min</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Tipos de Produto */}
      <TipoProdutoModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onTipoProdutoCreated={adicionarTipoProduto}
        onTipoProdutoUpdated={atualizarTiposProduto}
        existingTipos={tiposProduto}
      />
    </div>
  );
}