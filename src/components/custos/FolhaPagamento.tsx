import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, User, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { calcularCustoTotalFuncionario } from '@/lib/folhaPagamentoUtils';

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
  
  // Rastrear qual campo foi editado por último (para recalcular quando salário base mudar)
  const [lastEditedFields, setLastEditedFields] = useState<Record<string, 'percent' | 'valor'>>({
    fgts: 'percent',
    inss: 'percent',
    rat: 'percent',
    ferias: 'percent',
    vale_transporte: 'percent',
    vale_alimentacao: 'percent',
    vale_refeicao: 'percent',
    plano_saude: 'percent',
    outros: 'percent'
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
        salario_base: parseCurrencyValue(formData.salario_base),
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
        semanas_por_mes: parseFloat(formData.semanas_por_mes),
        horas_totais_mes: parseFloat(formData.horas_por_dia) * parseFloat(formData.dias_por_semana) * parseFloat(formData.semanas_por_mes),
        custo_por_hora: calculateCustoPorHora(),
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

  const parseInputValue = (value: string) => {
    if (!value || value === '') return 0;
    // Remove formatação brasileira (pontos e transforma vírgula em ponto)
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const formatBrazilianNumber = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numValue) || numValue === 0) return '0,00'; // Retornar '0,00' ao invés de string vazia
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  };

  // Função para formatar números decimais preservando casas decimais
  const formatDecimalNumber = (value: number | string) => {
    if (!value && value !== 0) return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(numValue)) return '';
    return numValue.toString().replace('.', ',');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Desabilita setas para alterar valor
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
  };

  const handleInputWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Desabilita scroll para alterar valor
    e.preventDefault();
  };

  // Função para converter valor formatado para número
  const parseCurrencyValue = (value: string): number => {
    if (!value || value === '') return 0;
    // Remove pontos (separadores de milhar) e troca vírgula por ponto
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Função para formatar porcentagem simples (sem formatação de milhares)
  const formatPercentInput = (value: string) => {
    if (!value || value === '') return '';
    return value.toString();
  };

  // Função para converter porcentagem para número
  const parsePercentValue = (value: string): number => {
    if (!value || value === '') return 0;
    // Remove pontos (se houver) e troca vírgula por ponto
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(normalized);
    return isNaN(number) ? 0 : Math.max(0, Math.min(999.99, number));
  };

  // Função para calcular valor baseado em lógica: se valor > 0, usa valor; senão usa %
  const calculateItemValue = (percentValue: string | number, valorValue: string | number, salarioBase: number): number => {
    // Se já é número, usa direto; se é string, faz parse
    const valor = typeof valorValue === 'number' ? valorValue : parseCurrencyValue(valorValue);
    const percent = typeof percentValue === 'number' ? percentValue : parsePercentValue(percentValue);
    
    if (valor > 0) {
      return valor; // Prioriza o valor em R$
    } else if (percent > 0) {
      return Math.round((salarioBase * percent / 100) * 100) / 100; // Usa %
    }
    return 0;
  };

  // Função para formatar valor como moeda para input
  const formatCurrencyInput = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Handler para mudança no salário base com formatação
  const handleSalarioBaseChange = (inputValue: string) => {
    // Remove tudo que não é dígito
    const numericValue = inputValue.replace(/\D/g, '');
    
    // Converte para número dividindo por 100 (para ter centavos)
    const numberValue = parseInt(numericValue || '0') / 100;
    
    // Formata como moeda brasileira
    const formattedValue = formatCurrencyInput(numberValue);
    
    // Atualizar salário base
    const newFormData = { ...formData, salario_base: formattedValue };
    
    // Recalcular cada encargo baseado no lado que foi editado por último
    Object.keys(lastEditedFields).forEach((encargoKey) => {
      const wasPercent = lastEditedFields[encargoKey] === 'percent';
      const percentKey = `${encargoKey}_percent`;
      const valorKey = `${encargoKey}_valor`;
      
      if (wasPercent) {
        // Se última edição foi %, recalcula o R$
        const parsed = parsePercentValue(newFormData[percentKey as keyof typeof formData] as string);
        const calculatedValue = Math.round((numberValue * parsed / 100) * 100) / 100;
        newFormData[valorKey as keyof typeof formData] = calculatedValue > 0 ? formatCurrencyInput(calculatedValue) : '';
      } else {
        // Se última edição foi R$, recalcula a %
        const parsed = parseCurrencyValue(newFormData[valorKey as keyof typeof formData] as string);
        const calculatedPercent = numberValue > 0 ? Math.round((parsed / numberValue * 100) * 100) / 100 : 0;
        newFormData[percentKey as keyof typeof formData] = calculatedPercent > 0 ? calculatedPercent.toString().replace('.', ',') : '0,00';
      }
    });
    
    setFormData(newFormData);
  };

  // Calcular horas totais por mês
  const calculateHorasTotais = () => {
    const horasDia = parseFloat((formData.horas_por_dia || '0').replace(',', '.'));
    const diasSemana = parseFloat((formData.dias_por_semana || '0').replace(',', '.'));
    const semanasMes = parseFloat((formData.semanas_por_mes || '0').replace(',', '.'));
    return Math.round((horasDia * diasSemana * semanasMes) * 100) / 100;
  };

  // Calcular custo total do funcionário com base no formulário atual
  const calculateCustoTotalFormulario = () => {
    const salarioBase = parseCurrencyValue(formData.salario_base);
    const adicional = parseFloat(formData.adicional) || 0;
    const desconto = parseFloat(formData.desconto) || 0;
    
    const fgtsTotal = calculateItemValue(formData.fgts_percent, formData.fgts_valor, salarioBase);
    const inssTotal = calculateItemValue(formData.inss_percent, formData.inss_valor, salarioBase);
    const ratTotal = calculateItemValue(formData.rat_percent, formData.rat_valor, salarioBase);
    const feriasTotal = calculateItemValue(formData.ferias_percent, formData.ferias_valor, salarioBase);
    const vtTotal = calculateItemValue(formData.vale_transporte_percent, formData.vale_transporte_valor, salarioBase);
    const vaTotal = calculateItemValue(formData.vale_alimentacao_percent, formData.vale_alimentacao_valor, salarioBase);
    const vrTotal = calculateItemValue(formData.vale_refeicao_percent, formData.vale_refeicao_valor, salarioBase);
    const planoTotal = calculateItemValue(formData.plano_saude_percent, formData.plano_saude_valor, salarioBase);
    const outrosTotal = calculateItemValue(formData.outros_percent, formData.outros_valor, salarioBase);
    
    return Math.round((salarioBase + adicional - desconto + fgtsTotal + inssTotal + ratTotal + feriasTotal + vtTotal + vaTotal + vrTotal + planoTotal + outrosTotal) * 100) / 100;
  };

  // Calcular custo por hora (baseado no custo total do funcionário)
  const calculateCustoPorHora = () => {
    const custoTotal = calculateCustoTotalFormulario();
    const horasTotais = calculateHorasTotais();
    
    return horasTotais > 0 ? Math.round((custoTotal / horasTotais) * 100) / 100 : 0;
  };

  // Handler para mudança em percentual
  const handlePercentChange = (key: string, value: string) => {
    const parsed = parsePercentValue(value);
    const salarioBase = parseCurrencyValue(formData.salario_base);
    const calculatedValue = Math.round((salarioBase * parsed / 100) * 100) / 100;
    
    const valorKey = key.replace('_percent', '_valor');
    const encargoKey = key.replace('_percent', '');
    
    // Atualizar tracking
    setLastEditedFields({ ...lastEditedFields, [encargoKey]: 'percent' });
    
    setFormData({ 
      ...formData, 
      [key]: value,
      [valorKey]: calculatedValue > 0 ? formatCurrencyInput(calculatedValue) : ''
    });
  };

  // Handler para mudança em valor monetário
  const handleValueChange = (key: string, value: string) => {
    const parsed = parseCurrencyValue(value);
    const salarioBase = parseCurrencyValue(formData.salario_base);
    const calculatedPercent = salarioBase > 0 ? Math.round((parsed / salarioBase * 100) * 100) / 100 : 0;
    
    const percentKey = key.replace('_valor', '_percent');
    const encargoKey = key.replace('_valor', '');
    
    // Atualizar tracking
    setLastEditedFields({ ...lastEditedFields, [encargoKey]: 'valor' });
    
    setFormData({ 
      ...formData, 
      [key]: value,
      [percentKey]: calculatedPercent > 0 ? calculatedPercent.toString().replace('.', ',') : '0,00'
    });
  };

  // Handler para campos de horas
  const handleHorasChange = (field: string, value: string) => {
    const parsed = parseInputValue(value);
    setFormData({ ...formData, [field]: parsed.toString() });
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
    
    // Resetar tracking para 'percent' como padrão
    setLastEditedFields({
      fgts: 'percent',
      inss: 'percent',
      rat: 'percent',
      ferias: 'percent',
      vale_transporte: 'percent',
      vale_alimentacao: 'percent',
      vale_refeicao: 'percent',
      plano_saude: 'percent',
      outros: 'percent'
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
      horas_por_dia: formatDecimalNumber(funcionario.horas_por_dia) || '8',
      dias_por_semana: formatDecimalNumber(funcionario.dias_por_semana) || '5',
      semanas_por_mes: formatDecimalNumber(funcionario.semanas_por_mes) || '4,33'
    });
    
    // Resetar tracking para 'percent' como padrão
    setLastEditedFields({
      fgts: 'percent',
      inss: 'percent',
      rat: 'percent',
      ferias: 'percent',
      vale_transporte: 'percent',
      vale_alimentacao: 'percent',
      vale_refeicao: 'percent',
      plano_saude: 'percent',
      outros: 'percent'
    });
    
    setIsModalOpen(true);
  };

  const handleDuplicate = (funcionario: Funcionario) => {
    setEditingFuncionario(null); // Novo funcionário, não está editando
    setFormData({
      nome: '', // Nome vazio para ser preenchido pelo usuário
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
      horas_por_dia: formatDecimalNumber(funcionario.horas_por_dia) || '8',
      dias_por_semana: formatDecimalNumber(funcionario.dias_por_semana) || '5',
      semanas_por_mes: formatDecimalNumber(funcionario.semanas_por_mes) || '4,33'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('folha_pagamento')
        .delete()
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
    const adicional = funcionario.adicional || 0;
    const desconto = funcionario.desconto || 0;
    
    // Usa os valores numéricos diretamente, sem converter para string
    const fgtsTotal = calculateItemValue(funcionario.fgts_percent, funcionario.fgts_valor, salarioBase);
    const inssTotal = calculateItemValue(funcionario.inss_percent, funcionario.inss_valor, salarioBase);
    const ratTotal = calculateItemValue(funcionario.rat_percent, funcionario.rat_valor, salarioBase);
    const feriasTotal = calculateItemValue(funcionario.ferias_percent, funcionario.ferias_valor, salarioBase);
    const vtTotal = calculateItemValue(funcionario.vale_transporte_percent, funcionario.vale_transporte_valor, salarioBase);
    const vaTotal = calculateItemValue(funcionario.vale_alimentacao_percent, funcionario.vale_alimentacao_valor, salarioBase);
    const vrTotal = calculateItemValue(funcionario.vale_refeicao_percent, funcionario.vale_refeicao_valor, salarioBase);
    const planoTotal = calculateItemValue(funcionario.plano_saude_percent, funcionario.plano_saude_valor, salarioBase);
    const outrosTotal = calculateItemValue(funcionario.outros_percent, funcionario.outros_valor, salarioBase);
    
    return Math.round((salarioBase + adicional - desconto + fgtsTotal + inssTotal + ratTotal + feriasTotal + vtTotal + vaTotal + vrTotal + planoTotal + outrosTotal) * 100) / 100;
  };

  const getTotalFolha = () => {
    return funcionarios.reduce((total, funcionario) => total + calculateCustoTotal(funcionario), 0);
  };

  const calculateCustoPorHoraFuncionario = (funcionario: Funcionario) => {
    const horasTotais = (funcionario.horas_por_dia || 0) * (funcionario.dias_por_semana || 0) * (funcionario.semanas_por_mes || 0);
    const custoTotal = calculateCustoTotal(funcionario);
    return horasTotais > 0 ? Math.round((custoTotal / horasTotais) * 100) / 100 : 0;
  };

  // Formatar custo por hora para exibição
  const formatCustoPorHora = (valor: number) => {
    if (calculateHorasTotais() <= 0) return "—";
    return formatCurrencyDisplay(valor);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Folha de Pagamento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Total da Folha: <span className="font-bold text-foreground">{formatCurrency(getTotalFolha())}</span>
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewFuncionario} size="sm" className="gap-1.5 rounded-xl h-9">
              <Plus className="h-3.5 w-3.5" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Dados básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tipo_mao_obra" className="text-xs">Tipo de Mão de Obra *</Label>
                  <Select value={formData.tipo_mao_obra} onValueChange={(value) => setFormData({ ...formData, tipo_mao_obra: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direta">Direta</SelectItem>
                      <SelectItem value="indireta">Indireta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs">Nome *</Label>
                  <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: João Silva" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo" className="text-xs">Cargo *</Label>
                  <Input id="cargo" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} placeholder="Ex: Vendedor, Gerente..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salario_base" className="text-xs">Salário Bruto *</Label>
                  <div className="relative">
                    <Input id="salario_base" type="text" value={formData.salario_base} onChange={(e) => handleSalarioBaseChange(e.target.value)} placeholder="0,00" className="pl-8" autoComplete="off" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  </div>
                </div>
              </div>

              {/* Encargos */}
              <div>
                <h4 className="text-sm font-semibold font-display mb-3">Encargos sobre o Salário</h4>
                <div className="space-y-2">
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
                    <div key={encargo.label} className="grid grid-cols-[1fr_110px_130px] gap-3 items-center">
                      <Label className="text-xs font-medium">{encargo.label}</Label>
                      <div className="relative">
                        <Input type="text" value={formData[encargo.percentKey as keyof typeof formData]} onChange={(e) => handlePercentChange(encargo.percentKey, e.target.value)} onKeyDown={handleInputKeyDown} onWheel={handleInputWheel} placeholder="0,00" className="pr-6 h-8 text-sm" autoComplete="off" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                      </div>
                      <div className="relative">
                        <Input type="text" value={formData[encargo.valorKey as keyof typeof formData]} onChange={(e) => handleValueChange(encargo.valorKey, e.target.value)} onKeyDown={handleInputKeyDown} onWheel={handleInputWheel} placeholder="0,00" className="pl-7 h-8 text-sm" autoComplete="off" />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculadora de Horas */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold font-display mb-3">Calculadora de Horas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="horas_por_dia" className="text-xs">Horas por Dia</Label>
                      <Input id="horas_por_dia" type="text" key={`horas-${formData.horas_por_dia}`} defaultValue={formatDecimalNumber(formData.horas_por_dia)} onBlur={(e) => { const parsed = parseInputValue(e.target.value); handleHorasChange('horas_por_dia', e.target.value); e.target.value = formatDecimalNumber(parsed); }} placeholder="8" autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dias_por_semana" className="text-xs">Dias por Semana</Label>
                      <Input id="dias_por_semana" type="text" key={`dias-${formData.dias_por_semana}`} defaultValue={formatDecimalNumber(formData.dias_por_semana)} onBlur={(e) => { const parsed = parseInputValue(e.target.value); handleHorasChange('dias_por_semana', e.target.value); e.target.value = formatDecimalNumber(parsed); }} placeholder="5" autoComplete="off" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="semanas_por_mes" className="text-xs">Semanas por Mês</Label>
                      <Input id="semanas_por_mes" type="text" key={`semanas-${formData.semanas_por_mes}`} defaultValue={formatDecimalNumber(formData.semanas_por_mes)} onBlur={(e) => { const parsed = parseInputValue(e.target.value); handleHorasChange('semanas_por_mes', e.target.value); e.target.value = formatDecimalNumber(parsed); }} placeholder="4,33" autoComplete="off" />
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 rounded-xl bg-[#0483e4]/5 border border-[#0483e4]/20">
                    <div className="text-center mb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo Total deste Funcionário</p>
                      <p className="text-xl font-bold font-display text-[#0483e4]">R$ {formatCurrencyDisplay(calculateCustoTotalFormulario())}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Horas/Mês</p>
                        <p className="text-sm font-bold font-display">{calculateHorasTotais()}h</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo/Hora</p>
                        <p className="text-sm font-bold font-display text-[#7328b1]">
                          {calculateHorasTotais() > 0 ? `R$ ${formatCustoPorHora(calculateCustoPorHora())}` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 rounded-xl">
                  {editingFuncionario ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de funcionários */}
      {funcionarios.length === 0 ? (
        <Card className="glass-card overflow-hidden">
          <div className="h-1 bg-gradient-brand-horizontal" />
          <CardContent className="p-12 text-center">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium font-display mb-1">Nenhum funcionário cadastrado</p>
            <p className="text-xs text-muted-foreground">Clique em "Novo Funcionário" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {funcionarios.map((funcionario, i) => (
            <Card key={funcionario.id} className="glass-card overflow-hidden group hover:shadow-elevated transition-all duration-300 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className={`h-1 bg-gradient-to-r ${funcionario.tipo_mao_obra === 'direta' ? 'from-[#16a34a] to-[#15803d]' : 'from-[#0483e4] to-[#2c4dc7]'}`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-xl ${funcionario.tipo_mao_obra === 'direta' ? 'bg-[#16a34a]/10' : 'bg-[#0483e4]/10'}`}>
                      <User className={`h-5 w-5 ${funcionario.tipo_mao_obra === 'direta' ? 'text-[#16a34a]' : 'text-[#0483e4]'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium font-display truncate">{funcionario.nome}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          funcionario.tipo_mao_obra === 'direta' 
                            ? 'bg-[#16a34a]/10 text-[#16a34a]' 
                            : 'bg-[#0483e4]/10 text-[#0483e4]'
                        }`}>
                          {funcionario.tipo_mao_obra === 'direta' ? 'Direta' : 'Indireta'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{funcionario.cargo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo/Hora</p>
                        <p className="text-sm font-bold font-display text-[#7328b1]">R$ {formatCurrencyDisplay(calculateCustoPorHoraFuncionario(funcionario))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                        <p className="text-sm font-bold font-display text-foreground">R$ {formatCurrencyDisplay(calculateCustoTotal(funcionario))}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(funcionario)} className="h-8 w-8 p-0 rounded-xl">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(funcionario)} className="h-8 w-8 p-0 rounded-xl" title="Duplicar">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(funcionario.id)} className="h-8 w-8 p-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile: show values */}
                <div className="flex md:hidden items-center gap-4 mt-2 pt-2 border-t border-border/30">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Custo/Hora</p>
                    <p className="text-xs font-bold text-[#7328b1]">R$ {formatCurrencyDisplay(calculateCustoPorHoraFuncionario(funcionario))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                    <p className="text-xs font-bold">R$ {formatCurrencyDisplay(calculateCustoTotal(funcionario))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}