import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Plus, Trash2, Edit2, Check, X, Info, Settings } from 'lucide-react';
import { useUserConfigurations } from '@/hooks/useUserConfigurations';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustosModal } from './CustosModal';

interface MarkupBlock {
  id: string;
  nome: string;
  gastoSobreFaturamento: number;
  impostos: number;
  taxasMeiosPagamento: number;
  comissoesPlataformas: number;
  outros: number;
  lucroDesejado: number;
}

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlock[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');
  const [blocoSelecionado, setBlocoSelecionado] = useState<MarkupBlock | undefined>(undefined);
  const [modalAberto, setModalAberto] = useState(false);
  const { loadConfiguration, saveConfiguration } = useUserConfigurations();
  const { toast } = useToast();

  // Bloco fixo para subreceita
  const blocoSubreceita: MarkupBlock = {
    id: 'subreceita-fixo',
    nome: 'subreceita',
    gastoSobreFaturamento: 0,
    impostos: 0,
    taxasMeiosPagamento: 0,
    comissoesPlataformas: 0,
    outros: 0,
    lucroDesejado: 0
  };

  useEffect(() => {
    const carregarBlocos = async () => {
      const config = await loadConfiguration('markups_blocos');
      if (config && Array.isArray(config)) {
        setBlocos(config as unknown as MarkupBlock[]);
      }
    };
    carregarBlocos();
  }, [loadConfiguration]);

  const salvarBlocos = async (novosBlocos: MarkupBlock[]) => {
    await saveConfiguration('markups_blocos', novosBlocos);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const criarNovoBloco = () => {
    const novoBloco: MarkupBlock = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length + 1}`,
      gastoSobreFaturamento: 0,
      impostos: 0,
      taxasMeiosPagamento: 0,
      comissoesPlataformas: 0,
      outros: 0,
      lucroDesejado: 0
    };

    const novosBlocos = [...blocos, novoBloco];
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    toast({
      title: "Bloco criado",
      description: "Novo bloco de markup adicionado"
    });
  };

  const removerBloco = (id: string) => {
    const novosBlocos = blocos.filter(b => b.id !== id);
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
    
    toast({
      title: "Bloco removido",
      description: "Bloco de markup removido com sucesso"
    });
  };

  const atualizarBloco = (id: string, campo: keyof MarkupBlock, valor: any) => {
    const novosBlocos = blocos.map(bloco => 
      bloco.id === id ? { ...bloco, [campo]: valor } : bloco
    );
    setBlocos(novosBlocos);
    salvarBlocos(novosBlocos);
  };

  const calcularMarkupIdeal = (bloco: MarkupBlock) => {
    const totalCustos = bloco.gastoSobreFaturamento + bloco.impostos + 
                       bloco.taxasMeiosPagamento + bloco.comissoesPlataformas + 
                       bloco.outros;
    const markup = (100 / (100 - totalCustos - bloco.lucroDesejado)) - 1;
    return markup;
  };

  const iniciarEdicaoNome = (bloco: MarkupBlock) => {
    setEditandoId(bloco.id);
    setNomeTemp(bloco.nome);
  };

  const salvarNome = (id: string) => {
    if (nomeTemp.trim()) {
      atualizarBloco(id, 'nome', nomeTemp.trim());
    }
    setEditandoId(null);
    setNomeTemp('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNomeTemp('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary mb-1 flex items-center justify-between">
            Blocos de Markup
            <Button onClick={criarNovoBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Bloco
            </Button>
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Crie e gerencie seus diferentes cenários de markup
          </p>
        </CardHeader>
      </Card>

      {blocos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum bloco criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro bloco de markup para começar
            </p>
            <Button onClick={criarNovoBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Bloco
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Bloco fixo subreceita */}
        <TooltipProvider>
          <Card className="relative border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-primary">SubReceita</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white cursor-help">
                        <Info className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3 bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Atenção:</strong> Este bloco é exclusivo para subprodutos que não são vendidos 
                        separadamente, como massas, recheios e coberturas. Ele serve apenas para 
                        organizar ingredientes usados em receitas.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBlocoSelecionado(undefined);
                    setModalAberto(true);
                  }}
                  className="text-primary hover:text-primary"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Gasto sobre faturamento</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-blue-600 bg-gray-50"
                  />
                  <span className="text-sm text-blue-600">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-sm">Impostos</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-blue-600 bg-gray-50"
                  />
                  <span className="text-sm text-blue-600">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-sm">Taxas de meios de pagamento</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-blue-600 bg-gray-50"
                  />
                  <span className="text-sm text-blue-600">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-sm">Comissões e plataformas</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-blue-600 bg-gray-50"
                  />
                  <span className="text-sm text-blue-600">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-sm">Outros</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-blue-600 bg-gray-50"
                  />
                  <span className="text-sm text-blue-600">%</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t pt-3">
                <Label className="text-sm font-medium">Lucro desejado sobre venda</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={0}
                    disabled
                    className="w-16 h-7 text-center text-sm text-green-600 bg-gray-50"
                  />
                  <span className="text-sm text-green-600">%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg">
                <span className="font-semibold text-blue-700">Markup ideal</span>
                <span className="text-xl font-bold text-blue-700">1,000</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </TooltipProvider>

        {/* Blocos editáveis */}
        {blocos.map((bloco) => {
          const markupIdeal = calcularMarkupIdeal(bloco);
          
          return (
            <Card key={bloco.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  {editandoId === bloco.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={nomeTemp}
                        onChange={(e) => setNomeTemp(e.target.value)}
                        className="text-lg font-semibold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') salvarNome(bloco.id);
                          if (e.key === 'Escape') cancelarEdicao();
                        }}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => salvarNome(bloco.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelarEdicao}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => iniciarEdicaoNome(bloco)}
                    >
                      <h3 className="text-lg font-semibold text-primary">{bloco.nome}</h3>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBlocoSelecionado(bloco);
                      setModalAberto(true);
                    }}
                    className="text-primary hover:text-primary"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removerBloco(bloco.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Gasto sobre faturamento</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.gastoSobreFaturamento}
                        onChange={(e) => atualizarBloco(bloco.id, 'gastoSobreFaturamento', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-blue-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Impostos</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.impostos}
                        onChange={(e) => atualizarBloco(bloco.id, 'impostos', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-blue-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Taxas de meios de pagamento</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.taxasMeiosPagamento}
                        onChange={(e) => atualizarBloco(bloco.id, 'taxasMeiosPagamento', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-blue-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Comissões e plataformas</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.comissoesPlataformas}
                        onChange={(e) => atualizarBloco(bloco.id, 'comissoesPlataformas', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-blue-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Label className="text-sm">Outros</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.outros}
                        onChange={(e) => atualizarBloco(bloco.id, 'outros', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-blue-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-blue-600">%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t pt-3">
                    <Label className="text-sm font-medium">Lucro desejado sobre venda</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={bloco.lucroDesejado}
                        onChange={(e) => atualizarBloco(bloco.id, 'lucroDesejado', parseFloat(e.target.value) || 0)}
                        className="w-16 h-7 text-center text-sm text-green-600"
                        step="0.01"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-green-600">%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-semibold text-primary">Markup ideal</span>
                    <span className="text-xl font-bold text-primary">
                      {isFinite(markupIdeal) ? (markupIdeal * 100).toFixed(2) : '0,00'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CustosModal 
        open={modalAberto} 
        onOpenChange={(open) => {
          setModalAberto(open);
          if (!open) setBlocoSelecionado(undefined);
        }}
        markupBlock={blocoSelecionado}
        onMarkupUpdate={(dados) => {
          if (blocoSelecionado) {
            // Atualizar todas as propriedades de uma só vez para evitar múltiplos re-renders
            const novosBlocos = blocos.map(bloco => 
              bloco.id === blocoSelecionado.id 
                ? { 
                    ...bloco, 
                    impostos: dados.impostos || 0,
                    taxasMeiosPagamento: dados.taxasMeiosPagamento || 0,
                    comissoesPlataformas: dados.comissoesPlataformas || 0,
                    outros: dados.outros || 0
                  }
                : bloco
            );
            setBlocos(novosBlocos);
            salvarBlocos(novosBlocos);
          }
        }}
      />
    </div>
  );
}