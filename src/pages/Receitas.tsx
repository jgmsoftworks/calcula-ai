import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CriarReceitaModal } from '@/components/receitas/CriarReceitaModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Receita {
  id: string;
  nome: string;
  tempo_preparo_total: number;
  tempo_preparo_mao_obra: number;
  tipo_produto: string;
  rendimento_valor: number;
  rendimento_unidade: string;
  status: string;
  ingredientes_count: number;
  sub_receitas_count: number;
  embalagens_count: number;
  created_at: string;
  updated_at: string;
  markup_id: string;
  markup_nome: string;
  custo_materia_prima: number;
  custo_mao_obra: number;
  custo_embalagens: number;
  custo_total: number;
  preco_venda: number;
  margem_contribuicao: number;
  lucro_liquido: number;
}

const Receitas = () => {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingReceitaId, setEditingReceitaId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadReceitas();
    }
  }, [user?.id]);

  const loadReceitas = async () => {
    try {
      setLoading(true);

      // Buscar receitas básicas primeiro
      const { data: receitasData, error: receitasError } = await supabase
        .from('receitas')
        .select(`
          *,
          markups(nome, tipo)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        return;
      }

      if (!receitasData || receitasData.length === 0) {
        setReceitas([]);
        return;
      }

      // Buscar dados relacionados separadamente para cada receita
      const receitasComDados = await Promise.all(
        receitasData.map(async (receita) => {
          // Buscar ingredientes
          const { data: ingredientes } = await supabase
            .from('receita_ingredientes')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar sub-receitas  
          const { data: subReceitas } = await supabase
            .from('receita_sub_receitas')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar embalagens
          const { data: embalagens } = await supabase
            .from('receita_embalagens')
            .select('custo_total')
            .eq('receita_id', receita.id);

          // Buscar mão de obra
          const { data: maoObra } = await supabase
            .from('receita_mao_obra')
            .select('valor_total')
            .eq('receita_id', receita.id);

          return {
            ...receita,
            receita_ingredientes: ingredientes || [],
            receita_sub_receitas: subReceitas || [],
            receita_embalagens: embalagens || [],
            receita_mao_obra: maoObra || []
          };
        })
      );

      if (receitasError) {
        console.error('Erro ao carregar receitas:', receitasError);
        return;
      }

      // Transformar os dados para incluir as contagens e custos
      const receitasComContagens: Receita[] = receitasComDados.map((receita, index) => {
        const custoMateriaPrima = receita.receita_ingredientes?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoSubReceitas = receita.receita_sub_receitas?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoEmbalagens = receita.receita_embalagens?.reduce((sum: number, item: any) => sum + (Number(item.custo_total) || 0), 0) || 0;
        const custoMaoObra = receita.receita_mao_obra?.reduce((sum: number, item: any) => sum + (Number(item.valor_total) || 0), 0) || 0;
        
        const custoTotal = custoMateriaPrima + custoSubReceitas + custoEmbalagens + custoMaoObra;
        
        // Verificar se é uma sub-receita
        const isSubReceita = receita.markups?.tipo === 'sub_receita';
        
        // Sempre usar o preço de venda salvo no banco, ou valor padrão se não existir
        const precoVenda = receita.preco_venda || (custoTotal > 0 ? custoTotal * 2 : 0);
        
        let margemContribuicao, lucroLiquido;
        
        if (isSubReceita) {
          // Para sub-receitas: não mostrar lucro nem margem
          margemContribuicao = 0;
          lucroLiquido = 0;
        } else {
          // Para receitas normais: calcular margem e lucro
          margemContribuicao = precoVenda - custoTotal;
          lucroLiquido = margemContribuicao > 0 ? margemContribuicao * 0.8 : 0;
        }
        
        return {
          ...receita,
          ingredientes_count: receita.receita_ingredientes?.length || 0,
          sub_receitas_count: receita.receita_sub_receitas?.length || 0,
          embalagens_count: receita.receita_embalagens?.length || 0,
          markup_nome: receita.markups?.nome || 'Nenhum markup',
          custo_materia_prima: custoMateriaPrima + custoSubReceitas,
          custo_mao_obra: custoMaoObra,
          custo_embalagens: custoEmbalagens,
          custo_total: custoTotal,
          preco_venda: precoVenda,
          margem_contribuicao: margemContribuicao,
          lucro_liquido: lucroLiquido,
        };
      });

      setReceitas(receitasComContagens);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = (wasOpened: boolean) => {
    setIsModalOpen(wasOpened);
    if (!wasOpened) {
      // Recarregar receitas quando modal for fechado
      setEditingReceitaId(null);
      loadReceitas();
    }
  };

  const handleEditReceita = (receitaId: string) => {
    setEditingReceitaId(receitaId);
    setIsModalOpen(true);
  };

  const handleNovaReceita = () => {
    setEditingReceitaId(null);
    setIsModalOpen(true);
  };

  const deleteReceita = async (receitaId: string) => {
    if (!user?.id) return;

    setDeletingId(receitaId);
    
    // Update otimista: remove da lista imediatamente para feedback visual
    const receitaOriginal = receitas.find(r => r.id === receitaId);
    setReceitas(prev => prev.filter(r => r.id !== receitaId));
    
    try {
      console.log('🗑️ Iniciando deleção da receita:', receitaId);

      // Deletar dados relacionados primeiro (devido às foreign keys)
      await Promise.all([
        supabase.from('receita_ingredientes').delete().eq('receita_id', receitaId),
        supabase.from('receita_sub_receitas').delete().eq('receita_id', receitaId),
        supabase.from('receita_embalagens').delete().eq('receita_id', receitaId),
        supabase.from('receita_mao_obra').delete().eq('receita_id', receitaId)
      ]);

      // Por último, deletar a receita principal
      const { error: receitaError } = await supabase
        .from('receitas')
        .delete()
        .eq('id', receitaId)
        .eq('user_id', user.id);

      if (receitaError) {
        console.error('Erro ao deletar receita:', receitaError);
        throw receitaError;
      }

      console.log('✅ Receita deletada com sucesso');
      
      toast({
        title: "Sucesso",
        description: "Receita deletada com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      
      // Reverter update otimista em caso de erro
      if (receitaOriginal) {
        setReceitas(prev => [...prev, receitaOriginal].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
      
      toast({
        title: "Erro",
        description: "Não foi possível deletar a receita.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    // Se o valor for NaN, undefined, null ou não for um número válido, retorna R$ 0,00
    const validValue = (!value || isNaN(value)) ? 0 : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(validValue);
  };

  const downloadReceita = async (receitaId: string) => {
    try {
      // Buscar dados completos da receita
      const { data: receita, error: receitaError } = await supabase
        .from('receitas')
        .select(`
          *,
          markups(nome, tipo, margem_lucro, markup_aplicado)
        `)
        .eq('id', receitaId)
        .eq('user_id', user?.id)
        .single();

      if (receitaError || !receita) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados da receita.",
          variant: "destructive",
        });
        return;
      }

      // Buscar dados do perfil do negócio
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Buscar logo do negócio
      const { data: logoConfig } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('type', 'business_logo')
        .single();

      // Buscar ingredientes
      const { data: ingredientes } = await supabase
        .from('receita_ingredientes')
        .select('*')
        .eq('receita_id', receitaId);

      // Buscar sub-receitas
      const { data: subReceitas } = await supabase
        .from('receita_sub_receitas')
        .select('*')
        .eq('receita_id', receitaId);

      // Buscar embalagens
      const { data: embalagens } = await supabase
        .from('receita_embalagens')
        .select('*')
        .eq('receita_id', receitaId);

      // Buscar mão de obra
      const { data: maoObra } = await supabase
        .from('receita_mao_obra')
        .select('*')
        .eq('receita_id', receitaId);

      // Gerar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // Título da receita no topo
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(receita.nome.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Linha horizontal após título
      pdf.line(10, yPosition, pageWidth - 10, yPosition);
      yPosition += 10;

      // Layout em três colunas: Info da empresa (esquerda), Foto do produto (centro), Dados (direita)
      const leftColWidth = 45;
      const rightColWidth = 60;
      const centerColStart = leftColWidth + 10;
      const centerColWidth = pageWidth - leftColWidth - rightColWidth - 30;
      const rightColStart = pageWidth - rightColWidth - 10;

      // Coluna esquerda - Informações da empresa
      let leftYPos = yPosition;
      
      // Logo da empresa
      if (logoConfig && logoConfig.configuration) {
        try {
          const logoMaxSize = 30;
          const logoData = logoConfig.configuration as string;
          
          pdf.rect(10, leftYPos, leftColWidth, logoMaxSize + 5);
          pdf.addImage(logoData, 'PNG', 15, leftYPos + 2, logoMaxSize, logoMaxSize);
          leftYPos += logoMaxSize + 10;
        } catch (error) {
          console.error('Erro ao adicionar logo:', error);
          leftYPos += 35;
        }
      } else {
        pdf.rect(10, leftYPos, leftColWidth, 30);
        pdf.setFontSize(8);
        pdf.text('LOGO DA EMPRESA', 32.5, leftYPos + 18, { align: 'center' });
        leftYPos += 35;
      }

      // Informações da empresa
      const empresaInfo = [
        profile?.business_name || profile?.nome_fantasia || 'NOME FANTASIA',
        profile?.cnpj_cpf || 'CNPJ',
        profile?.telefone_comercial || profile?.celular || 'TELEFONE'
      ];

      empresaInfo.forEach(info => {
        pdf.rect(10, leftYPos, leftColWidth, 8);
        pdf.setFontSize(8);
        pdf.text(info, 12, leftYPos + 5);
        leftYPos += 8;
      });

      // Centro - Área da foto do produto
      pdf.rect(centerColStart, yPosition, centerColWidth, leftYPos - yPosition);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      
      // Texto diagonal "FOTO DO PRODUTO"
      const centerX = centerColStart + centerColWidth / 2;
      const centerY = yPosition + (leftYPos - yPosition) / 2;
      
      pdf.saveGraphicsState();
      pdf.setGState(pdf.GState({ opacity: 0.3 }));
      pdf.text('FOTO DO PRODUTO', centerX, centerY, { 
        align: 'center',
        angle: 45 
      });
      pdf.restoreGraphicsState();

      // Coluna direita - Dados
      let rightYPos = yPosition;
      
      // Seção Dados
      pdf.setFillColor(100, 100, 100);
      pdf.rect(rightColStart, rightYPos, rightColWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dados:', rightColStart + 2, rightYPos + 5);
      rightYPos += 8;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      const dadosInfo = [
        ['Tipo do Produto', receita.tipo_produto || 'MASSA'],
        ['Rendimento:', `${receita.rendimento_valor || 0} ${receita.rendimento_unidade || 'g'}`],
        ['Peso unitário:', `${receita.rendimento_valor || 0} g`]
      ];

      dadosInfo.forEach(([label, value]) => {
        pdf.rect(rightColStart, rightYPos, rightColWidth, 6);
        pdf.text(label, rightColStart + 2, rightYPos + 4);
        pdf.text(value, rightColStart + 30, rightYPos + 4);
        rightYPos += 6;
      });

      rightYPos += 3;

      // Seção Conservação
      pdf.setFillColor(100, 100, 100);
      pdf.rect(rightColStart, rightYPos, rightColWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Conservação:', rightColStart + 2, rightYPos + 5);
      rightYPos += 8;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      // Cabeçalho da tabela de conservação
      const conservacaoHeaders = ['Local', 'Temp. °C', 'Tempo'];
      const colWidths = [rightColWidth * 0.4, rightColWidth * 0.3, rightColWidth * 0.3];
      let xPos = rightColStart;

      conservacaoHeaders.forEach((header, i) => {
        pdf.rect(xPos, rightYPos, colWidths[i], 6);
        pdf.text(header, xPos + 1, rightYPos + 4);
        xPos += colWidths[i];
      });
      rightYPos += 6;

      // Linhas da tabela de conservação
      const conservacaoRows = [
        ['Congelado', '', ''],
        ['Refrigerado', '', ''],
        ['Ambiente', '', '']
      ];

      conservacaoRows.forEach(row => {
        xPos = rightColStart;
        row.forEach((cell, i) => {
          pdf.rect(xPos, rightYPos, colWidths[i], 6);
          pdf.text(cell, xPos + 1, rightYPos + 4);
          xPos += colWidths[i];
        });
        rightYPos += 6;
      });

      // Posicionar para próximas seções
      yPosition = Math.max(leftYPos, rightYPos) + 10;

      // Tabela de Ingredientes
      if (ingredientes && ingredientes.length > 0) {
        // Cabeçalho
        pdf.setFillColor(100, 100, 100);
        pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ingredientes', 12, yPosition + 5);
        
        const tableHeaders = ['Un. Medida', '1 Receita', '2 Receitas', '3 Receitas'];
        const headerWidths = [(pageWidth - 80) / 2, (pageWidth - 80) / 6, (pageWidth - 80) / 6, (pageWidth - 80) / 6];
        let headerX = 12 + (pageWidth - 80) / 2;
        
        tableHeaders.forEach((header, i) => {
          pdf.text(header, headerX, yPosition + 5);
          headerX += headerWidths[i];
        });
        
        yPosition += 8;

        // Linhas de ingredientes
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        ingredientes.forEach((ingrediente) => {
          pdf.rect(10, yPosition, pageWidth - 20, 6);
          pdf.text(ingrediente.nome, 12, yPosition + 4);
          pdf.text(ingrediente.unidade, 12 + (pageWidth - 80) / 2, yPosition + 4);
          pdf.text(ingrediente.quantidade.toString(), 12 + (pageWidth - 80) / 2 + (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((ingrediente.quantidade * 2).toString(), 12 + (pageWidth - 80) / 2 + 2 * (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((ingrediente.quantidade * 3).toString(), 12 + (pageWidth - 80) / 2 + 3 * (pageWidth - 80) / 6, yPosition + 4);
          yPosition += 6;
        });
        
        yPosition += 5;
      }

      // Tabela de Sub-receitas (se houver)
      if (subReceitas && subReceitas.length > 0) {
        pdf.setFillColor(100, 100, 100);
        pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Receitas', 12, yPosition + 5);
        
        const tableHeaders = ['Tipo', '1 Receita', '2 Receitas', '3 Receitas'];
        const headerWidths = [(pageWidth - 80) / 2, (pageWidth - 80) / 6, (pageWidth - 80) / 6, (pageWidth - 80) / 6];
        let headerX = 12 + (pageWidth - 80) / 2;
        
        tableHeaders.forEach((header, i) => {
          pdf.text(header, headerX, yPosition + 5);
          headerX += headerWidths[i];
        });
        
        yPosition += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        subReceitas.forEach((subReceita) => {
          pdf.rect(10, yPosition, pageWidth - 20, 6);
          pdf.text(subReceita.nome, 12, yPosition + 4);
          pdf.text(subReceita.unidade, 12 + (pageWidth - 80) / 2, yPosition + 4);
          pdf.text(subReceita.quantidade.toString(), 12 + (pageWidth - 80) / 2 + (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((subReceita.quantidade * 2).toString(), 12 + (pageWidth - 80) / 2 + 2 * (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((subReceita.quantidade * 3).toString(), 12 + (pageWidth - 80) / 2 + 3 * (pageWidth - 80) / 6, yPosition + 4);
          yPosition += 6;
        });
        
        yPosition += 5;
      }

      // Tabela de Embalagens (se houver)
      if (embalagens && embalagens.length > 0) {
        pdf.setFillColor(100, 100, 100);
        pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Embalagem', 12, yPosition + 5);
        
        const tableHeaders = ['Medida', '1 Receita', '2 Receitas', '3 Receitas'];
        const headerWidths = [(pageWidth - 80) / 2, (pageWidth - 80) / 6, (pageWidth - 80) / 6, (pageWidth - 80) / 6];
        let headerX = 12 + (pageWidth - 80) / 2;
        
        tableHeaders.forEach((header, i) => {
          pdf.text(header, headerX, yPosition + 5);
          headerX += headerWidths[i];
        });
        
        yPosition += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        embalagens.forEach((embalagem) => {
          pdf.rect(10, yPosition, pageWidth - 20, 6);
          pdf.text(embalagem.nome, 12, yPosition + 4);
          pdf.text(embalagem.unidade, 12 + (pageWidth - 80) / 2, yPosition + 4);
          pdf.text(embalagem.quantidade.toString(), 12 + (pageWidth - 80) / 2 + (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((embalagem.quantidade * 2).toString(), 12 + (pageWidth - 80) / 2 + 2 * (pageWidth - 80) / 6, yPosition + 4);
          pdf.text((embalagem.quantidade * 3).toString(), 12 + (pageWidth - 80) / 2 + 3 * (pageWidth - 80) / 6, yPosition + 4);
          yPosition += 6;
        });
        
        yPosition += 5;
      }

      // Modo de Preparo
      yPosition += 5;
      pdf.setFillColor(100, 100, 100);
      pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Modo de Preparo:', 12, yPosition + 5);
      yPosition += 8;

      // Seção de duas colunas para passos e fotos
      const stepColWidth = (pageWidth - 20) / 2;
      
      // Cabeçalhos das colunas
      pdf.setFillColor(200, 200, 200);
      pdf.rect(10, yPosition, stepColWidth, 6, 'F');
      pdf.rect(10 + stepColWidth, yPosition, stepColWidth, 6, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text('Passos', 12, yPosition + 4);
      pdf.text('Fotos dos Passos', 12 + stepColWidth, yPosition + 4);
      yPosition += 6;

      // Área vazia para passos (pode ser preenchida manualmente)
      const stepAreaHeight = 40;
      pdf.rect(10, yPosition, stepColWidth, stepAreaHeight);
      pdf.rect(10 + stepColWidth, yPosition, stepColWidth, stepAreaHeight);
      yPosition += stepAreaHeight + 5;

      // Observações
      pdf.setFillColor(100, 100, 100);
      pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Observações:', 12, yPosition + 5);
      yPosition += 8;

      if (receita.observacoes) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        const maxWidth = pageWidth - 20;
        const lines = pdf.splitTextToSize(receita.observacoes, maxWidth);
        pdf.text(lines, 12, yPosition + 5);
        yPosition += lines.length * 4 + 10;
      } else {
        // Área vazia para observações
        pdf.rect(10, yPosition, pageWidth - 20, 20);
        yPosition += 25;
      }

      // Salvar PDF
      const fileName = `receita-${receita.nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Sucesso",
        description: "Receita baixada com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao baixar receita:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar a receita.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e seus custos</p>
        </div>
        <Button onClick={handleNovaReceita} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando receitas...</p>
          </div>
        ) : receitas.length > 0 ? (
          receitas.map((receita, index) => (
            <Card key={receita.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
                        {index + 1}
                      </span>
                      <CardTitle className="text-lg">{receita.nome}</CardTitle>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{receita.tipo_produto || 'Tipo não definido'}</Badge>
                      <Badge variant="outline">{receita.markup_nome}</Badge>
                      {receita.rendimento_valor && (
                        <Badge variant="outline">
                          Rendimento: {receita.rendimento_valor} {receita.rendimento_unidade}
                        </Badge>
                      )}
                      <Badge variant={receita.status === 'finalizada' ? 'default' : 'outline'}>
                        {receita.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Criado: {new Date(receita.created_at).toLocaleDateString()}</p>
                      <p>Atualizado: {new Date(receita.updated_at).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReceita(receita.id)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditReceita(receita.id)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingId === receita.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deletar Receita</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja deletar a receita "{receita.nome}"? 
                            Esta ação não pode ser desfeita e todos os dados relacionados 
                            (ingredientes, sub-receitas, embalagens, mão de obra) serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteReceita(receita.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Deletar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo Total</p>
                    <p className="font-medium">{receita.tempo_preparo_total || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo M.O.</p>
                    <p className="font-medium">{receita.tempo_preparo_mao_obra || 0} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Ingredientes</p>
                    <p className="font-medium">{receita.ingredientes_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Sub-receitas</p>
                    <p className="font-medium">{receita.sub_receitas_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Embalagens</p>
                    <p className="font-medium">{receita.embalagens_count}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Custo M.O.</p>
                    <p className="font-medium text-orange-600">{formatCurrency(receita.custo_mao_obra)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Custo Matéria-Prima</p>
                    <p className="font-medium text-blue-600">{formatCurrency(receita.custo_materia_prima)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Custo Total</p>
                    <p className="font-medium text-red-600">{formatCurrency(receita.custo_total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Preço Venda</p>
                    <p className="font-medium text-purple-600">{formatCurrency(receita.preco_venda)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Margem Contribuição</p>
                    <p className="font-medium text-green-600">{formatCurrency(receita.margem_contribuicao)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Lucro Líquido</p>
                    <p className="font-medium text-teal-600">{formatCurrency(receita.lucro_liquido)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Nenhuma receita criada</h3>
                  <p className="text-muted-foreground">Comece criando sua primeira receita</p>
                </div>
                <Button onClick={handleNovaReceita} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Receita
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CriarReceitaModal 
        open={isModalOpen} 
        onOpenChange={handleModalClose}
        receitaId={editingReceitaId}
      />
    </div>
  );
};

export default Receitas;