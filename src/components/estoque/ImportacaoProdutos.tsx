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
        nome: 'Exemplo Produto 1',
        codigo_interno: 'PRD0001',
        codigo_barras: '7891234567890',
        categoria: 'Categoria Exemplo',
        marcas: 'Marca Exemplo',
        unidade: 'g',
        estoque_atual: 100,
        estoque_minimo: 10,
        custo_unitario: 15.50,
        total_embalagem: 1,
        status: 'Ativo'
      },
      {
        nome: 'Exemplo Produto 2',
        codigo_interno: 'PRD0002',
        codigo_barras: '7891234567891',
        categoria: 'Outra Categoria',
        marcas: 'Outra Marca',
        unidade: 'kg',
        estoque_atual: 50,
        estoque_minimo: 5,
        custo_unitario: 25.75,
        total_embalagem: 1,
        status: 'Ativo'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    
    // Ajustar largura das colunas
    const wscols = [
      { wch: 25 }, // nome
      { wch: 15 }, // codigo_interno
      { wch: 15 }, // codigo_barras
      { wch: 20 }, // categoria
      { wch: 15 }, // marcas
      { wch: 10 }, // unidade
      { wch: 12 }, // estoque_atual
      { wch: 12 }, // estoque_minimo
      { wch: 12 }, // custo_unitario
      { wch: 15 }, // total_embalagem
      { wch: 10 }  // status
    ];
    ws['!cols'] = wscols;

    // Adicionar validação de dados para unidade (coluna F - índice 5)
    const unidadeValidation = {
      type: 'list',
      allowBlank: false,
      formula1: '"g,kg,ml,l,un"',
      error: 'Selecione uma unidade válida: g, kg, ml, l ou un'
    };
    
    // Adicionar validação de dados para status (coluna K - índice 10) 
    const statusValidation = {
      type: 'list',
      allowBlank: false,
      formula1: '"Ativo,Inativo"',
      error: 'Selecione: Ativo ou Inativo'
    };

    // Aplicar validações nas linhas de dados (linha 2 em diante, até linha 1000)
    if (!ws['!dataValidation']) ws['!dataValidation'] = [];
    
    // Validação para coluna unidade (F2:F1000)
    ws['!dataValidation'].push({
      sqref: 'F2:F1000',
      ...unidadeValidation
    });
    
    // Validação para coluna status (K2:K1000)  
    ws['!dataValidation'].push({
      sqref: 'K2:K1000',
      ...statusValidation
    });

    XLSX.writeFile(wb, 'modelo_produtos.xlsx');
    
    toast({
      title: "Modelo baixado",
      description: "O arquivo modelo_produtos.xlsx foi baixado com sucesso!"
    });
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
        const rowNumber = i + 2; // +2 porque começa na linha 2 (linha 1 é header)

        try {
          // Validações básicas
          if (!row.nome) {
            errors.push(`Linha ${rowNumber}: Nome é obrigatório`);
            continue;
          }

          if (!row.unidade || !['g', 'kg', 'ml', 'l', 'un'].includes(row.unidade)) {
            errors.push(`Linha ${rowNumber}: Unidade deve ser g, kg, ml, l ou un`);
            continue;
          }

          if (row.status && !['Ativo', 'Inativo'].includes(row.status)) {
            errors.push(`Linha ${rowNumber}: Status deve ser Ativo ou Inativo`);
            continue;
          }

          // Converter categorias para array se for string
          let categorias = null;
          if (row.categoria) {
            categorias = typeof row.categoria === 'string' 
              ? row.categoria.split(',').map((c: string) => c.trim())
              : row.categoria;
          }

          // Converter marcas para array se for string
          let marcas = null;
          if (row.marcas) {
            marcas = typeof row.marcas === 'string'
              ? row.marcas.split(',').map((m: string) => m.trim())
              : row.marcas;
          }

          const produto = {
            nome: row.nome,
            codigo_interno: row.codigo_interno || null,
            codigo_barras: row.codigo_barras || null,
            categoria: row.categoria || null,
            categorias: categorias,
            marcas: marcas,
            unidade: row.unidade,
            estoque_atual: Number(row.estoque_atual) || 0,
            estoque_minimo: Number(row.estoque_minimo) || 0,
            custo_unitario: Number(row.custo_unitario) || 0,
            custo_medio: Number(row.custo_unitario) || 0,
            custo_total: (Number(row.estoque_atual) || 0) * (Number(row.custo_unitario) || 0),
            total_embalagem: Number(row.total_embalagem) || 1,
            ativo: row.status === 'Ativo' || row.status !== 'Inativo',
            user_id: user.id
          };

          const { error } = await supabase
            .from('produtos')
            .insert(produto);

          if (error) {
            errors.push(`Linha ${rowNumber}: ${error.message}`);
          } else {
            successfulImports.push(produto);
          }
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
              <li>• O campo "nome" é obrigatório</li>
              <li>• A unidade deve ser: g, kg, ml, l ou un (validação automática na planilha)</li>
              <li>• O status deve ser: Ativo ou Inativo (validação automática na planilha)</li>
              <li>• Categorias e marcas podem ser separadas por vírgula</li>
              <li>• Valores numéricos devem usar ponto como separador decimal</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};