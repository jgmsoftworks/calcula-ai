import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { gerarModeloProdutos } from '@/lib/excelTemplates';
import * as XLSX from 'xlsx';

interface ResultadoImportacao {
  produtos_criados: number;
  marcas_criadas: number;
  categorias_criadas: number;
  erros: string[];
}

export function ImportProdutosExcel({ onSuccess }: { onSuccess: () => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);

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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{resultado.erros.length} erro(s) encontrado(s):</span>
              </div>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {resultado.erros.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
