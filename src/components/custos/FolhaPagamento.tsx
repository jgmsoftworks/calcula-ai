import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  tipo_mao_obra: string;
  salario_base: number;
  adicional: number;
  desconto: number;
  fgts_percent: number;
  fgts_valor: number;
  inss_percent: number;
  inss_valor: number;
  rat_percent: number;
  rat_valor: number;
  ferias_percent: number;
  ferias_valor: number;
  vale_transporte_percent: number;
  vale_transporte_valor: number;
  vale_alimentacao_percent: number;
  vale_alimentacao_valor: number;
  vale_refeicao_percent: number;
  vale_refeicao_valor: number;
  plano_saude_percent: number;
  plano_saude_valor: number;
  outros_percent: number;
  outros_valor: number;
  horas_por_dia?: number;
  dias_por_semana?: number;
  semanas_por_mes?: number;
  horas_totais_mes?: number;
  custo_por_hora?: number;
  ativo: boolean;
  created_at: string;
}

export function FolhaPagamento() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    cargo: '',
    tipo_mao_obra: 'direta',
    salario_base: '',
    adicional: '',
    desconto: '',
    fgts_percent: '0,00',
    fgts_valor: '',
    inss_percent: '0,00',
    inss_valor: '',
    rat_percent: '0,00',
    rat_valor: '',
    ferias_percent: '0,00',
    ferias_valor: '',
    vale_transporte_percent: '0,00',
    vale_transporte_valor: '',
    vale_alimentacao_percent: '0,00',
    vale_alimentacao_valor: '',
    vale_refeicao_percent: '0,00',
    vale_refeicao_valor: '',
    plano_saude_percent: '0,00',
    plano_saude_valor: '',
    outros_percent: '0,00',
    outros_valor: '',
    horas_por_dia: '8',
    dias_por_semana: '5',
    semanas_por_mes: '4,33'
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const loadFuncionarios = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('folha_pagamento')
        .select('*')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar folha de pagamento:', error);
      toast({
        title: "Erro ao carregar folha",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadFuncionarios();
  }, [user]);

  const handleSave = async () => {
    if (!user || !formData.nome || !formData.cargo || !formData.salario_base) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, cargo e salário base",
        variant: "destructive"
      });
      return;
    }

    try {
      const funcionarioData = {
        user_id: user.id,
        nome: formData.nome,
        cargo: formData.cargo,
        tipo_mao_obra: formData.tipo_mao_obra,
        salario_base: parseFloat(formData.salario_base),
        adicional: formData.adicional ? parseFloat(formData.adicional) : 0,
        desconto: formData.desconto ? parseFloat(formData.desconto) : 0,
        fgts_percent: parsePercentValue(formData.fgts_percent),
        fgts_valor: parseCurrencyValue(formData.fgts_valor),
        inss_percent: parsePercentValue(formData.inss_percent),
        inss_valor: parseCurrencyValue(formData.inss_valor),
        rat_percent: parsePercentValue(formData.rat_percent),
        rat_valor: parseCurrencyValue(formData.rat_valor),
        ferias_percent: parsePercentValue(formData.ferias_percent),
        ferias_valor: parseCurrencyValue(formData.ferias_valor),
        vale_transporte_percent: parsePercentValue(formData.vale_transporte_percent),
        vale_transporte_valor: parseCurrencyValue(formData.vale_transporte_valor),
        vale_alimentacao_percent: parsePercentValue(formData.vale_alimentacao_percent),
        vale_alimentacao_valor: parseCurrencyValue(formData.vale_alimentacao_valor),
        vale_refeicao_percent: parsePercentValue(formData.vale_refeicao_percent),
        vale_refeicao_valor: parseCurrencyValue(formData.vale_refeicao_valor),
        plano_saude_percent: parsePercentValue(formData.plano_saude_percent),
        plano_saude_valor: parseCurrencyValue(formData.plano_saude_valor),
        outros_percent: parsePercentValue(formData.outros_percent),
        outros_valor: parseCurrencyValue(formData.outros_valor),
        horas_por_dia: parseFloat(formData.horas_por_dia),
        dias_por_semana: parseFloat(formData.dias_por_semana),
        semanas_por_mes: parsePercentValue(formData.semanas_por_mes),
        horas_totais_mes: parseFloat(formData.horas_por_dia) * parseFloat(formData.dias_por_semana) * parsePercentValue(formData.semanas_por_mes),
        custo_por_hora: 0, // Será calculado após o custo total
        ativo: true
      };

      if (editingFuncionario) {
        const { error } = await supabase
          .from('folha_pagamento')
          .update(funcionarioData)
          .eq('id', editingFuncionario.id);

        if (error) throw error;

        toast({
          title: "Funcionário atualizado",
          description: "Dados atualizados com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('folha_pagamento')
          .insert(funcionarioData);

        if (error) throw error;

        toast({
          title: "Funcionário adicionado",
          description: "Funcionário adicionado à folha com sucesso"
        });
      }

      setIsModalOpen(false);
      setEditingFuncionario(null);
      resetFormData();
      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  // Função para formatar valores monetários para exibição (sem símbolo R$)
  const formatCurrencyDisplay = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Função para formatar input monetário (sem símbolo R$)
  const formatCurrencyInput = (value: string) => {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Converte para número decimal
    const number = parseInt(digits) / 100;
    
    // Formata sem símbolo de moeda
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  };

  // Função para converter valor formatado para número
  const parseCurrencyValue = (value: string): number => {
    if (!value) return 0;
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits) / 100 : 0;
  };

  // Função para formatar porcentagem
  const formatPercentInput = (value: string) => {
    // Remove tudo que não é dígito, vírgula ou ponto
    const cleaned = value.replace(/[^\d.,]/g, '');
    // Substitui vírgula por ponto se necessário
    const normalized = cleaned.replace(',', '.');
    // Limita a 999.99
    const number = parseFloat(normalized || '0');
    if (number > 999.99) return '999,99';
    // Retorna formatado com vírgula
    return normalized.replace('.', ',');
  };

  // Função para converter porcentagem para número
  const parsePercentValue = (value: string): number => {
    if (!value) return 0;
    const normalized = value.replace(',', '.');
    const number = parseFloat(normalized);
    return isNaN(number) ? 0 : Math.max(0, Math.min(999.99, number));
  };

  // Função para calcular valor baseado em lógica: se valor > 0, usa valor; senão usa %
  const calculateItemValue = (percentValue: string, valorValue: string, salarioBase: number): number => {
    const valor = parseCurrencyValue(valorValue);
    const percent = parsePercentValue(percentValue);
    
    if (valor > 0) {
      return valor; // Prioriza o valor em R$
    } else if (percent > 0) {
      return Math.round((salarioBase * percent / 100) * 100) / 100; // Usa %
    }
    return 0;
  };

  // Handler para mudança no salário base
  const handleSalarioBaseChange = (value: string) => {
    const formattedValue = formatCurrencyInput(value);
    setFormData({ ...formData, salario_base: formattedValue });
  };

  // Calcular horas totais por mês
  const calculateHorasTotais = () => {
    const horasDia = parseFloat(formData.horas_por_dia || '0');
    const diasSemana = parseFloat(formData.dias_por_semana || '0');
    const semanasMes = parsePercentValue(formData.semanas_por_mes || '0');
    return Math.round((horasDia * diasSemana * semanasMes) * 100) / 100;
  };

  // Calcular custo por hora
  const calculateCustoPorHora = () => {
    const salarioBase = parseCurrencyValue(formData.salario_base);
    
    const fgtsTotal = parseCurrencyValue(formData.fgts_valor);
    const inssTotal = parseCurrencyValue(formData.inss_valor);
    const ratTotal = parseCurrencyValue(formData.rat_valor);
    const feriasTotal = parseCurrencyValue(formData.ferias_valor);
    const vtTotal = parseCurrencyValue(formData.vale_transporte_valor);
    const vaTotal = parseCurrencyValue(formData.vale_alimentacao_valor);
    const vrTotal = parseCurrencyValue(formData.vale_refeicao_valor);
    const planoTotal = parseCurrencyValue(formData.plano_saude_valor);
    const outrosTotal = parseCurrencyValue(formData.outros_valor);
    
    const custoTotal = salarioBase + fgtsTotal + inssTotal + ratTotal + feriasTotal + vtTotal + vaTotal + vrTotal + planoTotal + outrosTotal;
    const horasTotais = calculateHorasTotais();
    
    return horasTotais > 0 ? Math.round((custoTotal / horasTotais) * 100) / 100 : 0;
  };

  // Handler para campos de horas
  const handleHorasChange = (field: string, value: string) => {
    if (field === 'semanas_por_mes') {
      const formattedValue = formatPercentInput(value);
      setFormData({ ...formData, [field]: formattedValue });
    } else {
      const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const floatValue = parseFloat(numericValue);
      if (!isNaN(floatValue) && floatValue >= 0) {
        setFormData({ ...formData, [field]: numericValue });
      } else if (value === '') {
        setFormData({ ...formData, [field]: '' });
      }
    }
  };

  // Handler para mudança em percentual
  const handlePercentChange = (key: string, value: string) => {
    const formattedPercent = formatPercentInput(value);
    const salarioBase = parseCurrencyValue(formData.salario_base);
    const percent = parsePercentValue(formattedPercent);
    const calculatedValue = Math.round((salarioBase * percent / 100) * 100) / 100;
    
    const valorKey = key.replace('_percent', '_valor');
    setFormData({ 
      ...formData, 
      [key]: formattedPercent,
      [valorKey]: calculatedValue > 0 ? formatCurrencyDisplay(calculatedValue) : ''
    });
  };

  // Handler para mudança em valor monetário
  const handleValueChange = (key: string, value: string) => {
    const formattedValue = formatCurrencyInput(value);
    const salarioBase = parseCurrencyValue(formData.salario_base);
    const valorNumerico = parseCurrencyValue(formattedValue);
    const calculatedPercent = salarioBase > 0 ? Math.round((valorNumerico / salarioBase * 100) * 100) / 100 : 0;
    
    const percentKey = key.replace('_valor', '_percent');
    setFormData({ 
      ...formData, 
      [key]: formattedValue,
      [percentKey]: calculatedPercent > 0 ? calculatedPercent.toString().replace('.', ',') : '0,00'
    });
  };

  const resetFormData = () => {
    setFormData({
      nome: '',
      cargo: '',
      tipo_mao_obra: 'direta',
      salario_base: '',
      adicional: '',
      desconto: '',
      fgts_percent: '0,00',
      fgts_valor: '',
      inss_percent: '0,00',
      inss_valor: '',
      rat_percent: '0,00',
      rat_valor: '',
      ferias_percent: '0,00',
      ferias_valor: '',
      vale_transporte_percent: '0,00',
      vale_transporte_valor: '',
      vale_alimentacao_percent: '0,00',
      vale_alimentacao_valor: '',
      vale_refeicao_percent: '0,00',
      vale_refeicao_valor: '',
      plano_saude_percent: '0,00',
      plano_saude_valor: '',
      outros_percent: '0,00',
      outros_valor: '',
      horas_por_dia: '8',
      dias_por_semana: '5',
      semanas_por_mes: '4,33'
    });
  };

  const handleEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      nome: funcionario.nome,
      cargo: funcionario.cargo || '',
      tipo_mao_obra: funcionario.tipo_mao_obra,
      salario_base: formatCurrencyDisplay(funcionario.salario_base),
      adicional: funcionario.adicional.toString(),
      desconto: funcionario.desconto.toString(),
      fgts_percent: funcionario.fgts_percent.toString().replace('.', ','),
      fgts_valor: formatCurrencyDisplay(funcionario.fgts_valor),
      inss_percent: funcionario.inss_percent.toString().replace('.', ','),
      inss_valor: formatCurrencyDisplay(funcionario.inss_valor),
      rat_percent: funcionario.rat_percent.toString().replace('.', ','),
      rat_valor: formatCurrencyDisplay(funcionario.rat_valor),
      ferias_percent: funcionario.ferias_percent.toString().replace('.', ','),
      ferias_valor: formatCurrencyDisplay(funcionario.ferias_valor),
      vale_transporte_percent: funcionario.vale_transporte_percent.toString().replace('.', ','),
      vale_transporte_valor: formatCurrencyDisplay(funcionario.vale_transporte_valor),
      vale_alimentacao_percent: funcionario.vale_alimentacao_percent.toString().replace('.', ','),
      vale_alimentacao_valor: formatCurrencyDisplay(funcionario.vale_alimentacao_valor),
      vale_refeicao_percent: funcionario.vale_refeicao_percent.toString().replace('.', ','),
      vale_refeicao_valor: formatCurrencyDisplay(funcionario.vale_refeicao_valor),
      plano_saude_percent: funcionario.plano_saude_percent.toString().replace('.', ','),
      plano_saude_valor: formatCurrencyDisplay(funcionario.plano_saude_valor),
      outros_percent: funcionario.outros_percent.toString().replace('.', ','),
      outros_valor: formatCurrencyDisplay(funcionario.outros_valor),
      horas_por_dia: funcionario.horas_por_dia?.toString() || '8',
      dias_por_semana: funcionario.dias_por_semana?.toString() || '5',
      semanas_por_mes: funcionario.semanas_por_mes?.toString().replace('.', ',') || '4,33'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('folha_pagamento')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Funcionário removido",
        description: "Funcionário removido da folha com sucesso"
      });

      loadFuncionarios();
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      toast({
        title: "Erro ao remover",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  const handleNewFuncionario = () => {
    setEditingFuncionario(null);
    resetFormData();
    setIsModalOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateSalarioLiquido = (funcionario: Funcionario) => {
    return funcionario.salario_base + funcionario.adicional - funcionario.desconto;
  };

  const calculateCustoTotal = (funcionario: Funcionario) => {
    const salarioBase = funcionario.salario_base;
    
    const fgtsTotal = calculateItemValue(funcionario.fgts_percent.toString(), funcionario.fgts_valor.toString(), salarioBase);
    const inssTotal = calculateItemValue(funcionario.inss_percent.toString(), funcionario.inss_valor.toString(), salarioBase);
    const ratTotal = calculateItemValue(funcionario.rat_percent.toString(), funcionario.rat_valor.toString(), salarioBase);
    const feriasTotal = calculateItemValue(funcionario.ferias_percent.toString(), funcionario.ferias_valor.toString(), salarioBase);
    const vtTotal = calculateItemValue(funcionario.vale_transporte_percent.toString(), funcionario.vale_transporte_valor.toString(), salarioBase);
    const vaTotal = calculateItemValue(funcionario.vale_alimentacao_percent.toString(), funcionario.vale_alimentacao_valor.toString(), salarioBase);
    const vrTotal = calculateItemValue(funcionario.vale_refeicao_percent.toString(), funcionario.vale_refeicao_valor.toString(), salarioBase);
    const planoTotal = calculateItemValue(funcionario.plano_saude_percent.toString(), funcionario.plano_saude_valor.toString(), salarioBase);
    const outrosTotal = calculateItemValue(funcionario.outros_percent.toString(), funcionario.outros_valor.toString(), salarioBase);
    
    return Math.round((salarioBase + fgtsTotal + inssTotal + ratTotal + feriasTotal + vtTotal + vaTotal + vrTotal + planoTotal + outrosTotal) * 100) / 100;
  };

  const getTotalFolha = () => {
    return funcionarios.reduce((total, funcionario) => total + calculateCustoTotal(funcionario), 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Folha de Pagamento</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total da Folha: {formatCurrency(getTotalFolha())}
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewFuncionario} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Dados básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_mao_obra">Tipo de Mão de Obra *</Label>
                  <Select value={formData.tipo_mao_obra} onValueChange={(value) => setFormData({ ...formData, tipo_mao_obra: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direta">Direta</SelectItem>
                      <SelectItem value="indireta">Indireta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <Label htmlFor="cargo">Cargo *</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ex: Vendedor, Gerente..."
                  />
                </div>
                <div>
                  <Label htmlFor="salario_base">Salário Bruto *</Label>
                  <div className="relative">
                    <Input
                      id="salario_base"
                      value={formData.salario_base}
                      onChange={(e) => handleSalarioBaseChange(e.target.value)}
                      placeholder="0,00"
                      className="pl-8"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  </div>
                </div>
              </div>

              {/* Encargos */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Encargos sobre o Salário</h4>
                <div className="space-y-3">
                  {[
                    { label: 'FGTS', percentKey: 'fgts_percent', valorKey: 'fgts_valor' },
                    { label: 'INSS', percentKey: 'inss_percent', valorKey: 'inss_valor' },
                    { label: 'RAT', percentKey: 'rat_percent', valorKey: 'rat_valor' },
                    { label: 'Férias + 13º', percentKey: 'ferias_percent', valorKey: 'ferias_valor' },
                    { label: 'Vale Transporte', percentKey: 'vale_transporte_percent', valorKey: 'vale_transporte_valor' },
                    { label: 'Vale Alimentação', percentKey: 'vale_alimentacao_percent', valorKey: 'vale_alimentacao_valor' },
                    { label: 'Vale Refeição', percentKey: 'vale_refeicao_percent', valorKey: 'vale_refeicao_valor' },
                    { label: 'Plano de Saúde', percentKey: 'plano_saude_percent', valorKey: 'plano_saude_valor' },
                    { label: 'Outros', percentKey: 'outros_percent', valorKey: 'outros_valor' }
                  ].map((encargo) => (
                    <div key={encargo.label} className="grid grid-cols-[1fr_120px_140px] gap-4 items-center">
                      <Label className="text-primary font-medium">{encargo.label}</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={formData[encargo.percentKey as keyof typeof formData]}
                          onChange={(e) => handlePercentChange(encargo.percentKey, e.target.value)}
                          placeholder="0,00"
                          className="pr-6"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck="false"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="text"
                          value={formData[encargo.valorKey as keyof typeof formData]}
                          onChange={(e) => handleValueChange(encargo.valorKey, e.target.value)}
                          placeholder="0,00"
                          className="pl-8"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck="false"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      </div>
                    </div>
                ))}
                </div>

                {/* Calculadora de Horas */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Calculadora de Horas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="horas_por_dia">Horas por Dia</Label>
                      <Input
                        id="horas_por_dia"
                        type="text"
                        value={formData.horas_por_dia}
                        onChange={(e) => handleHorasChange('horas_por_dia', e.target.value)}
                        placeholder="8"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dias_por_semana">Dias por Semana</Label>
                      <Input
                        id="dias_por_semana"
                        type="text"
                        value={formData.dias_por_semana}
                        onChange={(e) => handleHorasChange('dias_por_semana', e.target.value)}
                        placeholder="5"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </div>
                    <div>
                      <Label htmlFor="semanas_por_mes">Semanas por Mês</Label>
                      <Input
                        id="semanas_por_mes"
                        type="text"
                        value={formData.semanas_por_mes}
                        onChange={(e) => handleHorasChange('semanas_por_mes', e.target.value)}
                        placeholder="4,33"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </div>
                  </div>
                  
                  {/* Resultado das horas */}
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Horas por Mês</p>
                        <p className="text-lg font-semibold">{calculateHorasTotais()}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo por Hora</p>
                        <p className="text-lg font-semibold text-primary">R$ {formatCurrencyDisplay(calculateCustoPorHora())}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custo Total */}
                {formData.salario_base && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-primary">
                        Custo Total deste Funcionário: R$ {(() => {
                          const salarioBase = parseCurrencyValue(formData.salario_base);
                          
                          const fgtsTotal = parseCurrencyValue(formData.fgts_valor);
                          const inssTotal = parseCurrencyValue(formData.inss_valor);
                          const ratTotal = parseCurrencyValue(formData.rat_valor);
                          const feriasTotal = parseCurrencyValue(formData.ferias_valor);
                          const vtTotal = parseCurrencyValue(formData.vale_transporte_valor);
                          const vaTotal = parseCurrencyValue(formData.vale_alimentacao_valor);
                          const vrTotal = parseCurrencyValue(formData.vale_refeicao_valor);
                          const planoTotal = parseCurrencyValue(formData.plano_saude_valor);
                          const outrosTotal = parseCurrencyValue(formData.outros_valor);
                          
                          const total = Math.round((salarioBase + fgtsTotal + inssTotal + ratTotal + feriasTotal + vtTotal + vaTotal + vrTotal + planoTotal + outrosTotal) * 100) / 100;
                          
                          return formatCurrencyDisplay(total);
                        })()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  {editingFuncionario ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Salário Base</TableHead>
              <TableHead>Custo Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funcionarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum funcionário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              funcionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {funcionario.nome}
                    </div>
                  </TableCell>
                  <TableCell>{funcionario.cargo}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      funcionario.tipo_mao_obra === 'direta' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {funcionario.tipo_mao_obra === 'direta' ? 'Direta' : 'Indireta'}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(funcionario.salario_base)}</TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(calculateCustoTotal(funcionario))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(funcionario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(funcionario.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}