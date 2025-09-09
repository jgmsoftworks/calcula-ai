import { useState } from 'react';
import { Clock, Package, TrendingUp, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function ProjecaoStep() {
  const [tipoProduto, setTipoProduto] = useState('');
  const [rendimento, setRendimento] = useState('');
  const [tempoPreparoTotal, setTempoPreparoTotal] = useState(0);
  const [tempoPreparoMaoObra, setTempoPreparoMaoObra] = useState(0);
  const [tiposProduto, setTiposProduto] = useState<string[]>([]);
  const [novoTipo, setNovoTipo] = useState('');
  const [modalAberto, setModalAberto] = useState(false);

  // Mock data para cálculos
  const custoIngredientes = 45.20;
  const custoSubReceitas = 12.50;
  const custoEmbalagens = 3.80;
  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens;

  const adicionarTipoProduto = () => {
    if (novoTipo.trim() && !tiposProduto.includes(novoTipo.trim())) {
      setTiposProduto([...tiposProduto, novoTipo.trim()]);
      setNovoTipo('');
      setModalAberto(false);
    }
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
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={modalAberto} onOpenChange={setModalAberto}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="px-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Tipo de Produto</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="novo-tipo">Nome do Tipo</Label>
                          <Input
                            id="novo-tipo"
                            placeholder="Ex: Doce, Salgado, Bebida..."
                            value={novoTipo}
                            onChange={(e) => setNovoTipo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && adicionarTipoProduto()}
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setModalAberto(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={adicionarTipoProduto} disabled={!novoTipo.trim()}>
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div>
                <Label htmlFor="rendimento">Rendimento *</Label>
                <Input
                  id="rendimento"
                  placeholder="Ex: 8 fatias, 500ml, 12 unidades"
                  value={rendimento}
                  onChange={(e) => setRendimento(e.target.value)}
                />
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

            {rendimento && (
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custo por Unidade</Label>
                  <p className="text-lg font-bold text-primary">
                    R$ {(custoTotal / (parseInt(rendimento.match(/\d+/)?.[0] || '1'))).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Baseado no rendimento: {rendimento}
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
    </div>
  );
}