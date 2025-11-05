import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UNIDADES_VALIDAS } from '@/lib/constants';

interface ImportacaoProdutosProps {
  onImportSuccess?: () => void;
}

export const ImportacaoProdutos = ({ onImportSuccess }: ImportacaoProdutosProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const downloadTemplate = () => {
    const template = [
      {
        'NOME': 'Farinha de Trigo',
        'CODIGO PDV': 'FT001',
        'CODIGO DE BARRAS': '7891234567890',
        'CATEGORIA': 'Farinhas',
        'MARCA': 'Marca Exemplo',
        'UNIDADE DE MEDIDA': 'k',
        'TOTAL DENTRO DA EMBALAGEM': 5,
        'CUSTO TOTAL': 45.50,
        'ESTOQUE ATUAL': 10,
        'ESTOQUE MINIMO': 2,
        'UNIDADE MEDIDA (Conversão)': 'xícara',
        'QUANTO DENTRO DE CADA': 140,
        'STATUS': 'Ativo'
      },
      {
        'NOME': 'Açúcar Cristal',
        'CODIGO PDV': 'AC001',
        'CODIGO DE BARRAS': '7891234567891',
        'CATEGORIA': 'Açúcares',
        'MARCA': 'Outra Marca',
        'UNIDADE DE MEDIDA': 'k',
        'TOTAL DENTRO DA EMBALAGEM': 1,
        'CUSTO TOTAL': 8.90,
        'ESTOQUE ATUAL': 20,
        'ESTOQUE MINIMO': 5,
        'UNIDADE MEDIDA (Conversão)': '',
        'QUANTO DENTRO DE CADA': '',
        'STATUS': 'Ativo'
      },
      {
        'NOME': 'Leite Integral',
        'CODIGO PDV': 'LI001',
        'CODIGO DE BARRAS': '',
        'CATEGORIA': 'Laticínios',
        'MARCA': '',
        'UNIDADE DE MEDIDA': 'l',
        'TOTAL DENTRO DA EMBALAGEM': 1,
        'CUSTO TOTAL': 5.50,
        'ESTOQUE ATUAL': 15,
        'ESTOQUE MINIMO': 3,
        'UNIDADE MEDIDA (Conversão)': 'ml',
        'QUANTO DENTRO DE CADA': 250,
        'STATUS': 'Ativo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    
    // Ajustar largura das colunas
    const wscols = [
      { wch: 30 }, // NOME
      { wch: 15 }, // CODIGO PDV
      { wch: 18 }, // CODIGO DE BARRAS
      { wch: 18 }, // CATEGORIA
      { wch: 18 }, // MARCA
      { wch: 20 }, // UNIDADE DE MEDIDA
      { wch: 25 }, // TOTAL DENTRO DA EMBALAGEM
      { wch: 15 }, // CUSTO TOTAL
      { wch: 15 }, // ESTOQUE ATUAL
      { wch: 16 }, // ESTOQUE MINIMO
      { wch: 28 }, // UNIDADE MEDIDA (Conversão)
      { wch: 22 }, // QUANTO DENTRO DE CADA
      { wch: 12 }  // STATUS
    ];
    ws['!cols'] = wscols;

    // Formatar headers em negrito
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      if (!ws[address].s) ws[address].s = {};
      ws[address].s.font = { bold: true };
    }

    // Adicionar validação de dados para UNIDADE DE MEDIDA (coluna F)
    const unidadeValidation = {
      type: 'list',
      allowBlank: false,
      formula1: `"${UNIDADES_VALIDAS.join(',')}"`,
      error: `Selecione uma unidade válida: ${UNIDADES_VALIDAS.join(', ')}`
    };
    
    // Adicionar validação de dados para UNIDADE MEDIDA (Conversão) (coluna K)
    const conversaoValidation = {
      type: 'list',
      allowBlank: true,
      formula1: '"g,kg,ml,l,un,colher chá,colher sopa,xícara"',
      error: 'Selecione uma unidade válida'
    };
    
    // Adicionar validação de dados para STATUS (coluna M)
    const statusValidation = {
      type: 'list',
      allowBlank: false,
      formula1: '"Ativo,Inativo"',
      error: 'Selecione: Ativo ou Inativo'
    };

    // Aplicar validações nas linhas de dados
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    
    ws['!dataValidation'].push({
      sqref: 'F2:F1000',
      ...unidadeValidation
    });
    
    ws['!dataValidation'].push({
      sqref: 'K2:K1000',
      ...conversaoValidation
    });
    
    ws['!dataValidation'].push({
      sqref: 'M2:M1000',
      ...statusValidation
    });

    XLSX.writeFile(wb, 'modelo_produtos.xlsx');
    
    toast({
      title: "Modelo baixado",
      description: "O arquivo modelo_produtos.xlsx foi baixado com sucesso!"
    });
  };

  // Função auxiliar para buscar ou criar categoria
  const getOrCreateCategoria = async (nomeCategoria: string, userId: string): Promise<string | null> => {
    if (!nomeCategoria || nomeCategoria.trim() === '') return null;
    
    const nomeNormalizado = nomeCategoria.trim();
    
    try {
      // Buscar categoria existente (case-insensitive)
      const { data: existingCategoria } = await supabase
        .from('categorias')
        .select('id')
        .eq('user_id', userId)
        .ilike('nome', nomeNormalizado)
        .maybeSingle();
      
      if (existingCategoria) {
        return existingCategoria.id;
      }
      
      // Criar nova categoria
      const { data: newCategoria, error } = await supabase
        .from('categorias')
        .insert({
          nome: nomeNormalizado,
          user_id: userId,
          ativo: true
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Erro ao criar categoria:', error);
        return null;
      }
      
      return newCategoria.id;
    } catch (error) {
      console.error('Erro ao processar categoria:', error);
      return null;
    }
  };

  // Função auxiliar para buscar ou criar marca
  const getOrCreateMarca = async (nomeMarca: string, userId: string): Promise<string | null> => {
    if (!nomeMarca || nomeMarca.trim() === '') return null;
    
    const nomeNormalizado = nomeMarca.trim();
    
    try {
      // Buscar marca existente (case-insensitive)
      const { data: existingMarca } = await supabase
        .from('marcas')
        .select('id')
        .eq('user_id', userId)
        .ilike('nome', nomeNormalizado)
        .maybeSingle();
      
      if (existingMarca) {
        return existingMarca.id;
      }
      
      // Criar nova marca
      const { data: newMarca, error } = await supabase
        .from('marcas')
        .insert({
          nome: nomeNormalizado,
          user_id: userId,
          ativo: true
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Erro ao criar marca:', error);
        return null;
      }
      
      return newMarca.id;
    } catch (error) {
      console.error('Erro ao processar marca:', error);
      return null;
    }
  };

  const processFile = async (file: File) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const errors: string[] = [];
      const successfulImports: any[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNumber = i + 2;

        try {
          // Validações obrigatórias
          if (!row['NOME'] || row['NOME'].toString().trim() === '') {
            errors.push(`Linha ${rowNumber}: NOME é obrigatório`);
            continue;
          }

          // ✅ Validar unidade (normalizada para minúsculas)
          const unidadeNormalizada = row['UNIDADE DE MEDIDA']?.toString().toLowerCase();
          if (!unidadeNormalizada || !UNIDADES_VALIDAS.includes(unidadeNormalizada as any)) {
            errors.push(`Linha ${rowNumber}: UNIDADE DE MEDIDA inválida (deve ser: ${UNIDADES_VALIDAS.join(', ')})`);
            continue;
          }

          const totalEmbalagem = Number(row['TOTAL DENTRO DA EMBALAGEM']);
          if (!totalEmbalagem || totalEmbalagem <= 0) {
            errors.push(`Linha ${rowNumber}: TOTAL DENTRO DA EMBALAGEM deve ser maior que zero`);
            continue;
          }

          // Validação de dados de conversão (ambos devem estar preenchidos ou ambos vazios)
          const unidadeConversao = row['UNIDADE MEDIDA (Conversão)'];
          const quantidadeConversao = row['QUANTO DENTRO DE CADA'];
          
          if ((unidadeConversao && !quantidadeConversao) || (!unidadeConversao && quantidadeConversao)) {
            errors.push(`Linha ${rowNumber}: Dados de conversão incompletos (informe UNIDADE MEDIDA e QUANTO DENTRO DE CADA juntos)`);
            continue;
          }

          // ✅ Validar unidades de conversão permitidas (estendidas para conversões especiais)
          const unidadesConversaoValidas = [...UNIDADES_VALIDAS, 'colher chá', 'colher sopa', 'xícara'];
          if (unidadeConversao && !unidadesConversaoValidas.includes(unidadeConversao.toLowerCase())) {
            errors.push(`Linha ${rowNumber}: UNIDADE MEDIDA (Conversão) inválida`);
            continue;
          }

          // Processar categoria
          let categoriaId = null;
          if (row['CATEGORIA'] && row['CATEGORIA'].toString().trim() !== '') {
            categoriaId = await getOrCreateCategoria(row['CATEGORIA'].toString(), user.id);
          }

          // Processar marca
          let marcaId = null;
          if (row['MARCA'] && row['MARCA'].toString().trim() !== '') {
            marcaId = await getOrCreateMarca(row['MARCA'].toString(), user.id);
          }

          // Calcular custos
          const custoTotal = Number(row['CUSTO TOTAL']) || 0;
          const estoqueAtual = Number(row['ESTOQUE ATUAL']) || 0;
          const custoUnitario = totalEmbalagem > 0 ? custoTotal / totalEmbalagem : 0;
          const custoMedio = estoqueAtual > 0 ? custoTotal / estoqueAtual : custoUnitario;

          // Preparar arrays de categorias e marcas
          const categoriasArray = categoriaId ? [categoriaId] : null;
          const marcasArray = marcaId ? [marcaId] : null;

          // Preparar código de barras como array se fornecido
          let codigoBarrasArray = null;
          if (row['CODIGO DE BARRAS'] && row['CODIGO DE BARRAS'].toString().trim() !== '') {
            codigoBarrasArray = [row['CODIGO DE BARRAS'].toString().trim()];
          }

          const produto = {
            nome: row['NOME'].toString().trim(),
            codigo_interno: row['CODIGO PDV'] ? row['CODIGO PDV'].toString().trim() : null,
            codigo_barras: codigoBarrasArray,
            categoria: row['CATEGORIA'] ? row['CATEGORIA'].toString().trim() : null,
            categorias: categoriasArray,
            marcas: marcasArray,
            unidade: unidadeNormalizada, // ✅ Usar unidade normalizada (minúscula)
            total_embalagem: totalEmbalagem,
            custo_total: custoTotal,
            custo_unitario: custoUnitario,
            custo_medio: custoMedio,
            estoque_atual: estoqueAtual,
            estoque_minimo: Number(row['ESTOQUE MINIMO']) || 0,
            ativo: !row['STATUS'] || row['STATUS'] === 'Ativo',
            user_id: user.id
          };

          // Inserir produto
          const { data: produtoInserido, error: produtoError } = await supabase
            .from('produtos')
            .insert(produto)
            .select('id')
            .single();

          if (produtoError) {
            errors.push(`Linha ${rowNumber}: Erro ao inserir produto - ${produtoError.message}`);
            continue;
          }

          // Se há dados de conversão, inserir na tabela produto_conversoes
          if (unidadeConversao && quantidadeConversao && produtoInserido) {
            const quantidadeConversaoNum = Number(quantidadeConversao);
            const custoUnitarioUso = quantidadeConversaoNum > 0 
              ? custoUnitario / quantidadeConversaoNum 
              : 0;

            const { error: conversaoError } = await supabase
              .from('produto_conversoes')
              .insert({
                produto_id: produtoInserido.id,
                unidade_compra: unidadeNormalizada, // ✅ Usar unidade normalizada
                quantidade_por_unidade: totalEmbalagem,
                unidade_uso_receitas: unidadeConversao,
                quantidade_unidade_uso: quantidadeConversaoNum,
                custo_unitario_uso: custoUnitarioUso,
                user_id: user.id
              });

            if (conversaoError) {
              // Rollback: deletar o produto criado
              await supabase
                .from('produtos')
                .delete()
                .eq('id', produtoInserido.id);
              
              errors.push(`Linha ${rowNumber}: Erro ao inserir conversão - ${conversaoError.message}`);
              continue;
            }
          }

          successfulImports.push(produto);

        } catch (error) {
          errors.push(`Linha ${rowNumber}: Erro inesperado - ${error}`);
        }
      }

      setImportResult({
        success: successfulImports.length,
        errors: errors
      });

      if (successfulImports.length > 0) {
        toast({
          title: "Importação concluída",
          description: `${successfulImports.length} produtos importados com sucesso`
        });
        onImportSuccess?.();
      }

      if (errors.length > 0) {
        toast({
          title: "Alguns erros ocorreram",
          description: `${errors.length} produtos não puderam ser importados`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive"
      });
      return;
    }

    processFile(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação de Produtos
          </CardTitle>
          <CardDescription>
            Importe múltiplos produtos usando uma planilha Excel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção de download do modelo */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">1. Baixe o modelo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Baixe nossa planilha modelo para preencher com seus produtos
              </p>
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Modelo Excel
              </Button>
            </div>
          </div>

          {/* Seção de upload */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">2. Faça o upload da planilha preenchida</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o arquivo Excel com seus produtos preenchidos
              </p>
              <div className="space-y-2">
                <Label htmlFor="file-upload">Arquivo Excel</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <Button 
                    disabled={isProcessing}
                    variant="default"
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Importar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado da importação */}
          {importResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Resultado da Importação</h3>
              
              {importResult.success > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.success} produtos</strong> foram importados com sucesso!
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erros encontrados:</strong>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li className="text-sm">... e mais {importResult.errors.length - 10} erros</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Instruções */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Instruções:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>Campos obrigatórios:</strong> NOME, UNIDADE DE MEDIDA, TOTAL DENTRO DA EMBALAGEM</li>
              <li>• <strong>CODIGO PDV:</strong> Código interno do seu PDV/sistema (opcional)</li>
              <li>• <strong>CATEGORIA e MARCA:</strong> Serão criadas automaticamente se não existirem</li>
              <li>• <strong>UNIDADE DE MEDIDA:</strong> Deve ser g, kg, ml, l ou un (com validação automática)</li>
              <li>• <strong>Dados de conversão (opcional):</strong> Se preencher UNIDADE MEDIDA (Conversão), deve preencher QUANTO DENTRO DE CADA também</li>
              <li>• <strong>Unidades de conversão:</strong> g, kg, ml, l, un, colher chá, colher sopa, xícara</li>
              <li>• <strong>STATUS:</strong> Ativo ou Inativo (com validação automática, padrão Ativo)</li>
              <li>• <strong>Cálculos automáticos:</strong> Custo unitário e custo médio são calculados automaticamente</li>
              <li>• <strong>Formato numérico:</strong> Use ponto como separador decimal (ex: 45.50)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};