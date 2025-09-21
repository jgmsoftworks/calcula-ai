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

      // Buscar marcas dos produtos dos ingredientes
      const ingredientesComMarcas = [];
      if (ingredientes && ingredientes.length > 0) {
        for (const ingrediente of ingredientes) {
          const { data: produto } = await supabase
            .from('produtos')
            .select('marcas')
            .eq('id', ingrediente.produto_id)
            .single();
          
          ingredientesComMarcas.push({
            ...ingrediente,
            marcas: produto?.marcas || []
          });
        }
      }

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

      // Buscar marcas dos produtos das embalagens
      const embalagensComMarcas = [];
      if (embalagens && embalagens.length > 0) {
        for (const embalagem of embalagens) {
          const { data: produto } = await supabase
            .from('produtos')
            .select('marcas')
            .eq('id', embalagem.produto_id)
            .single();
          
          embalagensComMarcas.push({
            ...embalagem,
            marcas: produto?.marcas || []
          });
        }
      }

      // Buscar mão de obra
      const { data: maoObra } = await supabase
        .from('receita_mao_obra')
        .select('*')
        .eq('receita_id', receitaId);

      // Buscar passos de preparo
      const { data: passosPreparo } = await supabase
        .from('receita_passos_preparo')
        .select('*')
        .eq('receita_id', receitaId)
        .order('ordem');

      // Gerar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 10; // Margem top reduzida de 15 para 10

      // Título da receita no topo
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(receita.nome.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Linha horizontal após título
      pdf.line(5, yPosition, pageWidth - 5, yPosition); // Margens laterais reduzidas de 10 para 5
      yPosition += 10;

      // Layout em três colunas expandido: Info da empresa (esquerda), Foto do produto (centro), Dados (direita)
      const leftColWidth = 55; // Expandido de 45 para 55
      const rightColWidth = 70; // Expandido de 60 para 70  
      const centerColStart = leftColWidth + 5; // Margem reduzida de 10 para 5
      const centerColWidth = pageWidth - leftColWidth - rightColWidth - 20; // Margens reduzidas
      const rightColStart = pageWidth - rightColWidth - 5; // Margem reduzida de 10 para 5

      // Coluna esquerda - Informações da empresa
      let leftYPos = yPosition;
      
      // Logo da empresa
      if (logoConfig && logoConfig.configuration) {
        try {
          const logoMaxSize = 35; // Aumentado de 30 para 35
          const logoData = logoConfig.configuration as string;
          
          pdf.rect(5, leftYPos, leftColWidth, logoMaxSize + 5);
          pdf.addImage(logoData, 'PNG', 5, leftYPos, leftColWidth, logoMaxSize + 5); // Preenche toda a área
          leftYPos += logoMaxSize + 10;
        } catch (error) {
          console.error('Erro ao adicionar logo:', error);
          leftYPos += 35;
        }
      } else {
        pdf.rect(5, leftYPos, leftColWidth, 30); // Margem reduzida de 10 para 5
        pdf.setFontSize(8);
        pdf.text('LOGO DA EMPRESA', 5 + leftColWidth/2, leftYPos + 18, { align: 'center' }); // Centrado na nova margem
        leftYPos += 35;
      }

      // Informações da empresa
      const empresaInfo = [
        profile?.business_name || profile?.nome_fantasia || 'NOME FANTASIA',
        profile?.cnpj_cpf || 'CNPJ',
        profile?.telefone_comercial || profile?.celular || 'TELEFONE'
      ];

      empresaInfo.forEach(info => {
        pdf.rect(5, leftYPos, leftColWidth, 8); // Margem reduzida de 10 para 5
        pdf.setFontSize(8);
        pdf.text(info, 7, leftYPos + 5); // Ajustado para nova margem
        leftYPos += 8;
      });

      // Centro - Área da foto do produto
      pdf.rect(centerColStart, yPosition, centerColWidth, leftYPos - yPosition);
      
      // Verificar se existe imagem do produto
      const hasProductImage = receita.imagem_url && receita.imagem_url.trim() !== '';
      
      if (hasProductImage) {
        try {
          // Adicionar imagem do produto
          pdf.addImage(receita.imagem_url, 'JPEG', centerColStart + 2, yPosition + 2, centerColWidth - 4, leftYPos - yPosition - 4);
        } catch (error) {
          console.error('Erro ao carregar imagem do produto:', error);
          // Fallback para texto se houver erro na imagem
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(153, 153, 153);
          
          const centerX = centerColStart + centerColWidth / 2;
          const centerY = yPosition + (leftYPos - yPosition) / 2;
          
          pdf.text('ERRO AO CARREGAR IMAGEM', centerX, centerY, { 
            align: 'center'
          });
          
          pdf.setTextColor(0, 0, 0);
        }
      } else {
        // Só mostrar texto quando não houver imagem
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(153, 153, 153); // Cinza claro #999999
        
        const centerX = centerColStart + centerColWidth / 2;
        const centerY = yPosition + (leftYPos - yPosition) / 2;
        
        pdf.text('FOTO DO PRODUTO', centerX, centerY, { 
          align: 'center'
        });
        
        // Restaurar cor do texto para preto
        pdf.setTextColor(0, 0, 0);
      }

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
        ['Tipo do Produto', receita.tipo_produto || ''],
        ['Rendimento:', receita.rendimento_valor && receita.rendimento_unidade ? `${receita.rendimento_valor} ${receita.rendimento_unidade}` : ''],
        ['Peso unitário:', receita.peso_unitario ? `${receita.peso_unitario}g` : '']
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

      // Linhas da tabela de conservação - usar dados reais se existirem
      const conservacaoData = receita.conservacao as unknown as any[];
      let conservacaoRows = [];
      
      if (conservacaoData && Array.isArray(conservacaoData) && conservacaoData.length > 0) {
        // Usar dados reais de conservação
        conservacaoRows = conservacaoData.map(item => [
          item.descricao || '',
          item.temperatura || '',
          item.tempo && item.unidade_tempo ? `${item.tempo} ${item.unidade_tempo}` : ''
        ]);
      } else {
        // Campos vazios se não houver dados
        conservacaoRows = [
          ['Congelado', '', ''],
          ['Refrigerado', '', ''],
          ['Ambiente', '', '']
        ];
      }

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
      yPosition = Math.max(leftYPos, rightYPos) + 15;

      // Verificar se há ingredientes para mostrar tabela
      if (ingredientesComMarcas && ingredientesComMarcas.length > 0) {
        // Cabeçalho
        pdf.setFillColor(100, 100, 100);
        pdf.rect(5, yPosition, pageWidth - 10, 8, 'F'); // Margens reduzidas de 10-20 para 5-10
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const tableHeaders = ['Ingrediente', 'Un. Medida', 'Marcas', '1 Receita', '2 Receitas', '3 Receitas'];
        
        // Definir posições fixas das colunas para 6 colunas
        const col1X = 7; // Nome do ingrediente
        const col2X = 7 + (pageWidth - 70) * 0.35; // Unidade de medida
        const col3X = col2X + (pageWidth - 70) * 0.15; // Marcas
        const col4X = col3X + (pageWidth - 70) * 0.15; // 1 Receita
        const col5X = col4X + (pageWidth - 70) * 0.15; // 2 Receitas  
        const col6X = col5X + (pageWidth - 70) * 0.15; // 3 Receitas
        const columnPositions = [col1X, col2X, col3X, col4X, col5X, col6X];
        const columnWidths = [(pageWidth - 70) * 0.35, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.05];
        
        tableHeaders.forEach((header, i) => {
          // Centralizar texto na coluna
          const textWidth = pdf.getTextWidth(header);
          const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
          pdf.text(header, centerX, yPosition + 5);
        });
        
        yPosition += 8;

        // Linhas de ingredientes
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        ingredientesComMarcas.forEach((ingrediente) => {
          // Calcular altura necessária para marcas
          const marcas = ingrediente.marcas || [];
          const rowHeight = Math.max(6, marcas.length * 3 + 2); // Altura mínima de 6 ou baseada no número de marcas
          
          pdf.rect(5, yPosition, pageWidth - 10, rowHeight); // Margens reduzidas
          
          // Centralizar texto em cada coluna usando as mesmas posições do cabeçalho
          const nome = String(ingrediente.nome || '');
          const unidade = String(ingrediente.unidade || '');
          const qty1 = String(ingrediente.quantidade || 0);
          const qty2 = String((ingrediente.quantidade || 0) * 2);
          const qty3 = String((ingrediente.quantidade || 0) * 3);
          
          const values = [nome, unidade, '', qty1, qty2, qty3]; // Deixamos vazio para marcas pois será tratado separadamente
          
          values.forEach((value, i) => {
            if (i !== 2) { // Pular a coluna de marcas
              const safeValue = String(value || ''); // Garantir que é string
              if (safeValue) {
                const textWidth = pdf.getTextWidth(safeValue);
                const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
                pdf.text(safeValue, centerX, yPosition + 4);
              }
            }
          });
          
          // Exibir marcas na coluna específica (uma abaixo da outra)
          if (marcas.length > 0) {
            marcas.forEach((marca, marcaIndex) => {
              const marcaY = yPosition + 4 + (marcaIndex * 3);
              const marcaText = String(marca || ''); // Garantir que é string
              if (marcaText) {
                const textWidth = pdf.getTextWidth(marcaText);
                const centerX = columnPositions[2] + (columnWidths[2] - textWidth) / 2;
                pdf.text(marcaText, centerX, marcaY);
              }
            });
          }
          
          yPosition += rowHeight;
        });
        
        yPosition += 10;
      }

      // Tabela de Sub-receitas (se houver)
      if (subReceitas && subReceitas.length > 0) {
        pdf.setFillColor(100, 100, 100);
        pdf.rect(5, yPosition, pageWidth - 10, 8, 'F'); // Margens reduzidas
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const tableHeaders = ['Sub-receita', 'Tipo', '1 Receita', '2 Receitas', '3 Receitas'];
        
        // Usar as mesmas posições de colunas para consistência
        const col1X = 7; 
        const col2X = 7 + (pageWidth - 70) / 2; 
        const col3X = col2X + (pageWidth - 70) / 6; 
        const col4X = col3X + (pageWidth - 70) / 6; 
        const col5X = col4X + (pageWidth - 70) / 6; 
        const columnPositions = [col1X, col2X, col3X, col4X, col5X];
        const columnWidths = [(pageWidth - 70) / 2, (pageWidth - 70) / 6, (pageWidth - 70) / 6, (pageWidth - 70) / 6, (pageWidth - 70) / 6];
        
        tableHeaders.forEach((header, i) => {
          const textWidth = pdf.getTextWidth(header);
          const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
          pdf.text(header, centerX, yPosition + 5);
        });
        
        yPosition += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        subReceitas.forEach((subReceita) => {
          pdf.rect(5, yPosition, pageWidth - 10, 6); 
          
          // Centralizar texto em cada coluna
          const nome = String(subReceita.nome || '');
          const unidade = String(subReceita.unidade || '');
          const qty1 = String(subReceita.quantidade || 0);
          const qty2 = String((subReceita.quantidade || 0) * 2);
          const qty3 = String((subReceita.quantidade || 0) * 3);
          
          const values = [nome, unidade, qty1, qty2, qty3];
          
          values.forEach((value, i) => {
            const safeValue = String(value || ''); // Garantir que é string
            if (safeValue) {
              const textWidth = pdf.getTextWidth(safeValue);
              const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
              pdf.text(safeValue, centerX, yPosition + 4);
            }
          });
          
          yPosition += 6;
        });
        
        yPosition += 10;
      }

      // Verificar se há embalagens para mostrar tabela
      if (embalagensComMarcas && embalagensComMarcas.length > 0) {
        pdf.setFillColor(100, 100, 100);
        pdf.rect(5, yPosition, pageWidth - 10, 8, 'F'); // Margens reduzidas
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const tableHeaders = ['Embalagem', 'Medida', 'Marcas', '1 Receita', '2 Receitas', '3 Receitas'];
        
        // Definir posições fixas das colunas para 6 colunas (mesmo layout dos ingredientes)
        const col1X = 7; 
        const col2X = 7 + (pageWidth - 70) * 0.35; 
        const col3X = col2X + (pageWidth - 70) * 0.15; 
        const col4X = col3X + (pageWidth - 70) * 0.15; 
        const col5X = col4X + (pageWidth - 70) * 0.15; 
        const col6X = col5X + (pageWidth - 70) * 0.15; 
        const columnPositions = [col1X, col2X, col3X, col4X, col5X, col6X];
        const columnWidths = [(pageWidth - 70) * 0.35, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.15, (pageWidth - 70) * 0.05];
        
        tableHeaders.forEach((header, i) => {
          const textWidth = pdf.getTextWidth(header);
          const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
          pdf.text(header, centerX, yPosition + 5);
        });
        
        yPosition += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        
        embalagensComMarcas.forEach((embalagem) => {
          // Calcular altura necessária para marcas
          const marcas = embalagem.marcas || [];
          const rowHeight = Math.max(6, marcas.length * 3 + 2);
          
          pdf.rect(5, yPosition, pageWidth - 10, rowHeight);
          
          // Centralizar texto em cada coluna
          const nome = String(embalagem.nome || '');
          const unidade = String(embalagem.unidade || '');
          const qty1 = String(embalagem.quantidade || 0);
          const qty2 = String((embalagem.quantidade || 0) * 2);
          const qty3 = String((embalagem.quantidade || 0) * 3);
          
          const values = [nome, unidade, '', qty1, qty2, qty3]; // Deixamos vazio para marcas pois será tratado separadamente
          
          values.forEach((value, i) => {
            if (i !== 2) { // Pular a coluna de marcas
              const safeValue = String(value || ''); // Garantir que é string
              if (safeValue) {
                const textWidth = pdf.getTextWidth(safeValue);
                const centerX = columnPositions[i] + (columnWidths[i] - textWidth) / 2;
                pdf.text(safeValue, centerX, yPosition + 4);
              }
            }
          });
          
          // Exibir marcas na coluna específica (uma abaixo da outra)
          if (marcas.length > 0) {
            marcas.forEach((marca, marcaIndex) => {
              const marcaY = yPosition + 4 + (marcaIndex * 3);
              const marcaText = String(marca || ''); // Garantir que é string
              if (marcaText) {
                const textWidth = pdf.getTextWidth(marcaText);
                const centerX = columnPositions[2] + (columnWidths[2] - textWidth) / 2;
                pdf.text(marcaText, centerX, marcaY);
              }
            });
          }
          
          yPosition += rowHeight;
        });
        
        yPosition += 10;
      }

       // Modo de Preparo
      yPosition += 5;
      pdf.setFillColor(100, 100, 100);
      pdf.rect(5, yPosition, pageWidth - 10, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Modo de Preparo:', 7, yPosition + 5);
      yPosition += 12;

      // Renderizar passos de preparo com layout melhorado
      if (passosPreparo && passosPreparo.length > 0) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        
        for (let i = 0; i < passosPreparo.length; i++) {
          const passo = passosPreparo[i];
          
          // Verificar se precisa de nova página
          if (yPosition > 240) {
            pdf.addPage();
            yPosition = 20;
          }
          
          // Layout em duas colunas fixas
          const leftColumnWidth = pageWidth * 0.65; // 65% para texto
          const rightColumnX = leftColumnWidth + 5; // Posição da coluna direita
          const rightColumnWidth = pageWidth - rightColumnX - 10; // Largura da coluna direita
          
          // Salva a posição inicial do passo (para alinhar imagem)
          const stepStartY = yPosition;
          
          // Título do passo na coluna esquerda
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(70, 70, 70);
          pdf.text(`Passo ${passo.ordem}:`, 10, yPosition);
          yPosition += 5;
          
          // Texto do passo limitado à coluna esquerda
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          const lines = pdf.splitTextToSize(passo.descricao, leftColumnWidth - 20);
          pdf.text(lines, 10, yPosition);
          
          // Calcular altura do texto
          const textHeight = lines.length * 3; // Espaçamento reduzido entre linhas
          
          // Imagem ancorada ao topo da coluna direita (alinhada com o título)
          let imageHeight = 0;
          const logoSize = 20;
          
          if (passo.imagem_url) {
            try {
              const response = await fetch(passo.imagem_url);
              if (response.ok) {
                const blob = await response.blob();
                const reader = new FileReader();
                
                await new Promise<void>((resolve) => {
                  reader.onloadend = () => {
                    try {
                      const imageData = reader.result as string;
                      
                      // Imagem colada na borda direita
                      const imgX = pageWidth - logoSize - 10;
                      
                      pdf.addImage(imageData, 'JPEG', imgX, stepStartY, logoSize, logoSize, undefined, 'FAST');
                      
                      // Borda sutil na imagem
                      pdf.setDrawColor(200, 200, 200);
                      pdf.setLineWidth(0.5);
                      pdf.rect(imgX, stepStartY, logoSize, logoSize);
                      
                      imageHeight = logoSize;
                      
                    } catch (error) {
                      console.log('Erro ao processar imagem:', error);
                    }
                    resolve();
                  };
                  reader.readAsDataURL(blob);
                });
              }
            } catch (error) {
              console.log('Erro ao carregar imagem:', error);
            }
          }
          
          // A altura do passo é determinada pelo maior entre texto e imagem
          const stepHeight = Math.max(textHeight, imageHeight);
          yPosition += stepHeight + 2;
          
          // Linha divisória sutil entre passos (exceto no último)
          if (i < passosPreparo.length - 1) {
            pdf.setDrawColor(230, 230, 230);
            pdf.setLineWidth(0.3);
            pdf.line(10, yPosition, pageWidth - 10, yPosition);
            yPosition += 5;
          }
        }
        
        yPosition += 5;
      } else {
        // Mensagem quando não há passos
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Nenhum passo de preparo cadastrado.', 10, yPosition);
        yPosition += 20;
        pdf.setTextColor(0, 0, 0);
      }

      // Observações
      pdf.setFillColor(100, 100, 100);
      pdf.rect(5, yPosition, pageWidth - 10, 8, 'F'); // Margens reduzidas
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Observações:', 7, yPosition + 5); // Ajustado para nova margem
      yPosition += 8;

      if (receita.observacoes) {
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        const maxWidth = pageWidth - 10; // Largura expandida
        const lines = pdf.splitTextToSize(receita.observacoes, maxWidth);
        pdf.text(lines, 7, yPosition + 5); // Ajustado para nova margem
        yPosition += lines.length * 4 + 10;
      } else {
        // Área vazia para observações
        pdf.rect(5, yPosition, pageWidth - 10, 20); // Margens reduzidas
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

      <div className="grid grid-cols-1 gap-4 w-full">
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