import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, Upload, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { gerarModeloProdutos } from '@/lib/excelTemplates';
import * as XLSX from 'xlsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ResultadoImportacao {
  produtos_criados: number;
  marcas_criadas: number;
  categorias_criadas: number;
  erros: string[];
}

// Traduz mensagens de erro técnicas para linguagem amigável
function traduzirErro(erroTecnico: string): string {
  const linha = erroTecnico.match(/Linha (\d+):/)?.[1] || '?';
  
  if (erroTecnico.includes('duplicate key value violates unique constraint')) {
    if (erroTecnico.includes('codigo_interno')) {
      return `Linha ${linha}: Código interno já existe no seu estoque`;
    }
  }
  
  if (erroTecnico.includes('violates check constraint')) {
    return `Linha ${linha}: Valor inválido em um dos campos obrigatórios`;
  }
  
  if (erroTecnico.includes('not-null constraint')) {
    return `Linha ${linha}: Campo obrigatório não preenchido`;
  }
  
  if (erroTecnico.includes('invalid input syntax')) {
    return `Linha ${linha}: Formato de número inválido (use ponto como decimal)`;
  }
  
  if (erroTecnico.includes('unidade de compra inválida')) {
    return erroTecnico; // já está amigável
  }
  
  // Se não reconhecer, retorna uma versão simplificada
  return `Linha ${linha}: ${erroTecnico.split(':').slice(1).join(':').trim()}`;
}

export function ImportProdutosExcel({ onSuccess }: { onSuccess: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [errosAbertos, setErrosAbertos] = useState(false);

  const handleBaixarModelo = () => {
    try {
      gerarModeloProdutos();
      toast.success('Planilha modelo baixada com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar modelo:', error);
      toast.error('Erro ao gerar planilha modelo');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setResultado(null);
    }
  };

  const handleImportar = async () => {
    if (!arquivo) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Ler arquivo Excel
      const arrayBuffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Converter para base64
      const reader = new FileReader();
      reader.readAsDataURL(arquivo);
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        if (!base64) {
          toast.error('Erro ao processar arquivo');
          setLoading(false);
          return;
        }

        // Chamar edge function
        const { data: result, error } = await supabase.functions.invoke('import-produtos-excel', {
          body: { fileBase64: base64 }
        });

        if (error) throw error;

        setResultado(result);
        
        if (result.erros && result.erros.length > 0) {
          toast.warning(`Importação concluída com ${result.erros.length} erro(s)`);
        } else {
          toast.success('Importação concluída com sucesso!');
          onSuccess();
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setLoading(false);
      };
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      toast.error('Erro ao importar produtos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Baixar Modelo */}
      <div className="space-y-2">
        <Label>1. Baixar Planilha Modelo</Label>
        <Button onClick={handleBaixarModelo} variant="outline" className="w-full">
          <FileDown className="h-4 w-4 mr-2" />
          Baixar Planilha Modelo
        </Button>
        <p className="text-sm text-muted-foreground">
          Baixe a planilha modelo, preencha com seus produtos e faça o upload abaixo.
        </p>
      </div>

      {/* Upload */}
      <div className="space-y-2">
        <Label>2. Selecionar Arquivo Preenchido</Label>
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        {arquivo && (
          <p className="text-sm text-muted-foreground">
            Arquivo selecionado: {arquivo.name}
          </p>
        )}
        
        <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-3">
          <p className="font-medium text-sm">Campos obrigatórios (marcados com *):</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>codigo_interno*</strong>: Código único do produto (número)</li>
            <li><strong>nome*</strong>: Nome do produto</li>
            <li><strong>unidade_compra*</strong>: Unidade (cm, cx, fd, g, k, l, m, ml, pct, un)</li>
            <li><strong>custo_unitario*</strong>: Custo (número decimal)</li>
            <li><strong>estoque_atual*</strong>: Quantidade em estoque (número)</li>
          </ul>
          <p className="font-medium text-sm mt-3">Campos opcionais:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>codigos_barras</strong>: Códigos de barras separados por vírgula</li>
            <li><strong>marcas</strong>: Marcas separadas por vírgula</li>
            <li><strong>categorias</strong>: Categorias separadas por vírgula</li>
            <li><strong>estoque_minimo</strong>: Quantidade mínima desejada</li>
            <li><strong>unidade_uso</strong>: Unidade para receitas (quando diferente da compra)</li>
            <li><strong>fator_conversao</strong>: Fator de conversão entre unidades</li>
          </ul>
        </div>
      </div>

      {/* Botão Importar */}
      <Button 
        onClick={handleImportar} 
        disabled={!arquivo || loading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {loading ? 'Importando...' : 'Importar Produtos'}
      </Button>

      {/* Resultados */}
      {resultado && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-semibold">Resultado da Importação</h3>
          
          {resultado.produtos_criados > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{resultado.produtos_criados} produto(s) criado(s)</span>
            </div>
          )}
          
          {resultado.marcas_criadas > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{resultado.marcas_criadas} marca(s) criada(s)</span>
            </div>
          )}
          
          {resultado.categorias_criadas > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>{resultado.categorias_criadas} categoria(s) criada(s)</span>
            </div>
          )}
          
          {resultado.erros && resultado.erros.length > 0 && (
            <Collapsible open={errosAbertos} onOpenChange={setErrosAbertos}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto text-destructive hover:text-destructive"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {resultado.erros.length} erro(s) encontrado(s)
                    </span>
                  </div>
                  {errosAbertos ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1">
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 pl-2">
                  {resultado.erros.map((erro, index) => (
                    <li key={index}>{traduzirErro(erro)}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
