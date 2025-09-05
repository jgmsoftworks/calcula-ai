import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface CartaoParcelado {
  id: string;
  nome: string;
  percentual: number;
  valorFixo: number;
}

interface OutroItem {
  id: string;
  nome: string;
  percentual: number;
  valorFixo: number;
}

export const EncargosVenda = () => {
  // Base de cálculo
  const [baseVenda, setBaseVenda] = useState<number>(0);

  // GRUPO 1 - IMPOSTOS
  const [impostos, setImpostos] = useState({
    icms: { percentual: 0, valorFixo: 0 },
    iss: { percentual: 0, valorFixo: 0 },
    pisCofins: { percentual: 0, valorFixo: 0 },
    irpjCsll: { percentual: 0, valorFixo: 0 },
    ipi: { percentual: 0, valorFixo: 0 }
  });

  // GRUPO 2 - TAXAS DE MEIOS DE PAGAMENTO
  const [meiosPagamento, setMeiosPagamento] = useState({
    cartaoDebito: { percentual: 0, valorFixo: 0 },
    cartaoCredito: { percentual: 0, valorFixo: 0 },
    boleto: { percentual: 0, valorFixo: 0 },
    pix: { percentual: 0, valorFixo: 0 },
    gateway: { percentual: 0, valorFixo: 0 }
  });

  const [cartaoParcelado, setCartaoParcelado] = useState<CartaoParcelado[]>([]);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<string>('');

  // GRUPO 3 - COMISSÕES E PLATAFORMAS
  const [comissoes, setComissoes] = useState({
    marketing: { percentual: 0, valorFixo: 0 },
    delivery: { percentual: 0, valorFixo: 0 },
    saas: { percentual: 0, valorFixo: 0 },
    colaboradores: { percentual: 0, valorFixo: 0 }
  });

  // GRUPO 4 - OUTROS
  const [outrosItens, setOutrosItens] = useState<OutroItem[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2);
  };

  const parseNumber = (value: string) => {
    const parsed = parseFloat(value) || 0;
    return Math.max(0, parsed);
  };

  const calcularValor = useCallback((percentual: number, valorFixo: number) => {
    if (valorFixo > 0) return valorFixo;
    if (percentual > 0) return (percentual / 100) * baseVenda;
    return 0;
  }, [baseVenda]);

  const calcularTotalEncargos = useCallback(() => {
    let total = 0;

    // GRUPO 1 - IMPOSTOS
    Object.values(impostos).forEach(item => {
      total += calcularValor(item.percentual, item.valorFixo);
    });

    // GRUPO 2 - MEIOS DE PAGAMENTO
    Object.values(meiosPagamento).forEach(item => {
      total += calcularValor(item.percentual, item.valorFixo);
    });

    // Cartão Parcelado (apenas a parcela selecionada)
    if (parcelaSelecionada) {
      const parcela = cartaoParcelado.find(p => p.id === parcelaSelecionada);
      if (parcela) {
        total += calcularValor(parcela.percentual, parcela.valorFixo);
      }
    }

    // GRUPO 3 - COMISSÕES
    Object.values(comissoes).forEach(item => {
      total += calcularValor(item.percentual, item.valorFixo);
    });

    // GRUPO 4 - OUTROS
    outrosItens.forEach(item => {
      total += calcularValor(item.percentual, item.valorFixo);
    });

    return Math.round(total * 100) / 100;
  }, [impostos, meiosPagamento, cartaoParcelado, parcelaSelecionada, comissoes, outrosItens, calcularValor]);

  const adicionarParcela = () => {
    const novaId = Date.now().toString();
    setCartaoParcelado([...cartaoParcelado, {
      id: novaId,
      nome: `${cartaoParcelado.length + 2}x`,
      percentual: 0,
      valorFixo: 0
    }]);
  };

  const removerParcela = (id: string) => {
    setCartaoParcelado(cartaoParcelado.filter(p => p.id !== id));
    if (parcelaSelecionada === id) {
      setParcelaSelecionada('');
    }
  };

  const adicionarOutroItem = () => {
    const novoId = Date.now().toString();
    setOutrosItens([...outrosItens, {
      id: novoId,
      nome: '',
      percentual: 0,
      valorFixo: 0
    }]);
  };

  const removerOutroItem = (id: string) => {
    setOutrosItens(outrosItens.filter(i => i.id !== id));
  };

  const InputField = ({ 
    label, 
    percentual, 
    valorFixo, 
    onPercentualChange, 
    onValorFixoChange 
  }: {
    label: string;
    percentual: number;
    valorFixo: number;
    onPercentualChange: (value: number) => void;
    onValorFixoChange: (value: number) => void;
  }) => (
    <div className="grid grid-cols-3 gap-4 items-center">
      <Label className="text-sm">{label}</Label>
      <div>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={formatPercent(percentual)}
          onChange={(e) => onPercentualChange(parseNumber(e.target.value))}
          className="text-right"
          placeholder="0,00"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <div className="text-xs text-muted-foreground text-right mt-1">%</div>
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={valorFixo.toFixed(2)}
          onChange={(e) => onValorFixoChange(parseNumber(e.target.value))}
          className="text-right"
          placeholder="0,00"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <div className="text-xs text-muted-foreground text-right mt-1">R$</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Base de Cálculo */}
      <Card>
        <CardHeader>
          <CardTitle>Base de Cálculo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 items-center">
            <Label htmlFor="baseVenda">Valor da Venda (sem encargos)</Label>
            <div>
              <Input
                id="baseVenda"
                type="number"
                step="0.01"
                min="0"
                value={baseVenda.toFixed(2)}
                onChange={(e) => setBaseVenda(parseNumber(e.target.value))}
                className="text-right text-lg font-semibold"
                placeholder="0,00"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <div className="text-xs text-muted-foreground text-right mt-1">R$</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRUPO 1 - IMPOSTOS */}
      <Card>
        <CardHeader>
          <CardTitle>Grupo 1 — Impostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div></div>
            <div className="text-center font-medium">Percentual (%)</div>
            <div className="text-center font-medium">Valor (R$)</div>
          </div>

          <InputField
            label="ICMS"
            percentual={impostos.icms.percentual}
            valorFixo={impostos.icms.valorFixo}
            onPercentualChange={(value) => setImpostos({...impostos, icms: {...impostos.icms, percentual: value}})}
            onValorFixoChange={(value) => setImpostos({...impostos, icms: {...impostos.icms, valorFixo: value}})}
          />

          <InputField
            label="ISS"
            percentual={impostos.iss.percentual}
            valorFixo={impostos.iss.valorFixo}
            onPercentualChange={(value) => setImpostos({...impostos, iss: {...impostos.iss, percentual: value}})}
            onValorFixoChange={(value) => setImpostos({...impostos, iss: {...impostos.iss, valorFixo: value}})}
          />

          <InputField
            label="PIS/COFINS"
            percentual={impostos.pisCofins.percentual}
            valorFixo={impostos.pisCofins.valorFixo}
            onPercentualChange={(value) => setImpostos({...impostos, pisCofins: {...impostos.pisCofins, percentual: value}})}
            onValorFixoChange={(value) => setImpostos({...impostos, pisCofins: {...impostos.pisCofins, valorFixo: value}})}
          />

          <InputField
            label="IRPJ/CSLL"
            percentual={impostos.irpjCsll.percentual}
            valorFixo={impostos.irpjCsll.valorFixo}
            onPercentualChange={(value) => setImpostos({...impostos, irpjCsll: {...impostos.irpjCsll, percentual: value}})}
            onValorFixoChange={(value) => setImpostos({...impostos, irpjCsll: {...impostos.irpjCsll, valorFixo: value}})}
          />

          <InputField
            label="IPI"
            percentual={impostos.ipi.percentual}
            valorFixo={impostos.ipi.valorFixo}
            onPercentualChange={(value) => setImpostos({...impostos, ipi: {...impostos.ipi, percentual: value}})}
            onValorFixoChange={(value) => setImpostos({...impostos, ipi: {...impostos.ipi, valorFixo: value}})}
          />
        </CardContent>
      </Card>

      {/* GRUPO 2 - TAXAS DE MEIOS DE PAGAMENTO */}
      <Card>
        <CardHeader>
          <CardTitle>Grupo 2 — Taxas de Meios de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div></div>
            <div className="text-center font-medium">Percentual (%)</div>
            <div className="text-center font-medium">Valor (R$)</div>
          </div>

          <InputField
            label="Cartão de débito"
            percentual={meiosPagamento.cartaoDebito.percentual}
            valorFixo={meiosPagamento.cartaoDebito.valorFixo}
            onPercentualChange={(value) => setMeiosPagamento({...meiosPagamento, cartaoDebito: {...meiosPagamento.cartaoDebito, percentual: value}})}
            onValorFixoChange={(value) => setMeiosPagamento({...meiosPagamento, cartaoDebito: {...meiosPagamento.cartaoDebito, valorFixo: value}})}
          />

          <InputField
            label="Cartão de crédito"
            percentual={meiosPagamento.cartaoCredito.percentual}
            valorFixo={meiosPagamento.cartaoCredito.valorFixo}
            onPercentualChange={(value) => setMeiosPagamento({...meiosPagamento, cartaoCredito: {...meiosPagamento.cartaoCredito, percentual: value}})}
            onValorFixoChange={(value) => setMeiosPagamento({...meiosPagamento, cartaoCredito: {...meiosPagamento.cartaoCredito, valorFixo: value}})}
          />

          {/* Cartão de crédito parcelado */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="font-medium">Cartão de crédito parcelado</Label>
              <Button onClick={adicionarParcela} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar parcela
              </Button>
            </div>

            {cartaoParcelado.length > 0 && (
              <div className="space-y-2 mb-4">
                <Label>Selecionar parcela:</Label>
                <Select value={parcelaSelecionada} onValueChange={setParcelaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma parcela selecionada" />
                  </SelectTrigger>
                  <SelectContent>
                    {cartaoParcelado.map((parcela) => (
                      <SelectItem key={parcela.id} value={parcela.id}>
                        {parcela.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {cartaoParcelado.map((parcela) => (
              <div key={parcela.id} className="grid grid-cols-4 gap-4 items-center mb-2">
                <Input
                  value={parcela.nome}
                  onChange={(e) => setCartaoParcelado(cartaoParcelado.map(p => 
                    p.id === parcela.id ? {...p, nome: e.target.value} : p
                  ))}
                  placeholder="2x, 3x..."
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formatPercent(parcela.percentual)}
                  onChange={(e) => setCartaoParcelado(cartaoParcelado.map(p => 
                    p.id === parcela.id ? {...p, percentual: parseNumber(e.target.value)} : p
                  ))}
                  className="text-right"
                  placeholder="0,00"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={parcela.valorFixo.toFixed(2)}
                  onChange={(e) => setCartaoParcelado(cartaoParcelado.map(p => 
                    p.id === parcela.id ? {...p, valorFixo: parseNumber(e.target.value)} : p
                  ))}
                  className="text-right"
                  placeholder="0,00"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <Button
                  onClick={() => removerParcela(parcela.id)}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <InputField
            label="Boleto bancário"
            percentual={meiosPagamento.boleto.percentual}
            valorFixo={meiosPagamento.boleto.valorFixo}
            onPercentualChange={(value) => setMeiosPagamento({...meiosPagamento, boleto: {...meiosPagamento.boleto, percentual: value}})}
            onValorFixoChange={(value) => setMeiosPagamento({...meiosPagamento, boleto: {...meiosPagamento.boleto, valorFixo: value}})}
          />

          <InputField
            label="PIX"
            percentual={meiosPagamento.pix.percentual}
            valorFixo={meiosPagamento.pix.valorFixo}
            onPercentualChange={(value) => setMeiosPagamento({...meiosPagamento, pix: {...meiosPagamento.pix, percentual: value}})}
            onValorFixoChange={(value) => setMeiosPagamento({...meiosPagamento, pix: {...meiosPagamento.pix, valorFixo: value}})}
          />

          <InputField
            label="Gateway de pagamento"
            percentual={meiosPagamento.gateway.percentual}
            valorFixo={meiosPagamento.gateway.valorFixo}
            onPercentualChange={(value) => setMeiosPagamento({...meiosPagamento, gateway: {...meiosPagamento.gateway, percentual: value}})}
            onValorFixoChange={(value) => setMeiosPagamento({...meiosPagamento, gateway: {...meiosPagamento.gateway, valorFixo: value}})}
          />
        </CardContent>
      </Card>

      {/* GRUPO 3 - COMISSÕES E PLATAFORMAS */}
      <Card>
        <CardHeader>
          <CardTitle>Grupo 3 — Comissões e Plataformas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div></div>
            <div className="text-center font-medium">Percentual (%)</div>
            <div className="text-center font-medium">Valor (R$)</div>
          </div>

          <InputField
            label="Marketing"
            percentual={comissoes.marketing.percentual}
            valorFixo={comissoes.marketing.valorFixo}
            onPercentualChange={(value) => setComissoes({...comissoes, marketing: {...comissoes.marketing, percentual: value}})}
            onValorFixoChange={(value) => setComissoes({...comissoes, marketing: {...comissoes.marketing, valorFixo: value}})}
          />

          <InputField
            label="Aplicativo de delivery"
            percentual={comissoes.delivery.percentual}
            valorFixo={comissoes.delivery.valorFixo}
            onPercentualChange={(value) => setComissoes({...comissoes, delivery: {...comissoes.delivery, percentual: value}})}
            onValorFixoChange={(value) => setComissoes({...comissoes, delivery: {...comissoes.delivery, valorFixo: value}})}
          />

          <InputField
            label="Plataforma SaaS"
            percentual={comissoes.saas.percentual}
            valorFixo={comissoes.saas.valorFixo}
            onPercentualChange={(value) => setComissoes({...comissoes, saas: {...comissoes.saas, percentual: value}})}
            onValorFixoChange={(value) => setComissoes({...comissoes, saas: {...comissoes.saas, valorFixo: value}})}
          />

          <InputField
            label="Colaboradores (comissão)"
            percentual={comissoes.colaboradores.percentual}
            valorFixo={comissoes.colaboradores.valorFixo}
            onPercentualChange={(value) => setComissoes({...comissoes, colaboradores: {...comissoes.colaboradores, percentual: value}})}
            onValorFixoChange={(value) => setComissoes({...comissoes, colaboradores: {...comissoes.colaboradores, valorFixo: value}})}
          />
        </CardContent>
      </Card>

      {/* GRUPO 4 - OUTROS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Grupo 4 — Outros</CardTitle>
            <Button onClick={adicionarOutroItem} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar outro item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {outrosItens.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="font-medium">Nome</div>
              <div className="text-center font-medium">Percentual (%)</div>
              <div className="text-center font-medium">Valor (R$)</div>
              <div></div>
            </div>
          )}

          {outrosItens.map((item) => (
            <div key={item.id} className="grid grid-cols-4 gap-4 items-center">
              <Input
                value={item.nome}
                onChange={(e) => setOutrosItens(outrosItens.map(i => 
                  i.id === item.id ? {...i, nome: e.target.value} : i
                ))}
                placeholder="Nome do item"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formatPercent(item.percentual)}
                onChange={(e) => setOutrosItens(outrosItens.map(i => 
                  i.id === item.id ? {...i, percentual: parseNumber(e.target.value)} : i
                ))}
                className="text-right"
                placeholder="0,00"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.valorFixo.toFixed(2)}
                onChange={(e) => setOutrosItens(outrosItens.map(i => 
                  i.id === item.id ? {...i, valorFixo: parseNumber(e.target.value)} : i
                ))}
                className="text-right"
                placeholder="0,00"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <Button
                onClick={() => removerOutroItem(item.id)}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {outrosItens.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item personalizado adicionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* TOTAL */}
      <Card>
        <CardHeader>
          <CardTitle>Total dos Encargos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary text-center">
            {formatCurrency(calcularTotalEncargos())}
          </div>
          {baseVenda > 0 && (
            <div className="text-center text-muted-foreground mt-2">
              Valor líquido recebido: {formatCurrency(baseVenda - calcularTotalEncargos())}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};