import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ImportReceitasExcel = () => {
  const { toast } = useToast();
  const [clientEmail, setClientEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!clientEmail || !selectedFile) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, informe o email do cliente e selecione um arquivo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      // Buscar user_id do cliente pelo email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, plan')
        .ilike('email_comercial', clientEmail)
        .maybeSingle();

      // Se não encontrou, buscar em auth.users
      let clientUserId = profile?.user_id;
      
      if (!clientUserId) {
        const { data: authData } = await supabase.rpc('user_is_admin');
        if (authData) {
          // Admin pode buscar qualquer usuário
          const { data: users } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .limit(100);
          
          const matchedUser = users?.find(u => 
            u.full_name?.toLowerCase().includes(clientEmail.toLowerCase())
          );
          
          clientUserId = matchedUser?.user_id;
        }
      }

      if (!clientUserId) {
        toast({
          title: "Cliente não encontrado",
          description: "Nenhum usuário encontrado com esse email",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileBase64 = e.target?.result as string;

          // Chamar edge function
          const { data, error } = await supabase.functions.invoke('import-receitas-excel', {
            body: {
              clientUserId,
              fileBase64,
            },
          });

          if (error) throw error;

          setResultado(data);
          
          toast({
            title: "Importação concluída!",
            description: `${data.receitas_criadas} receitas importadas com sucesso`,
          });

        } catch (error: any) {
          console.error('Erro ao importar:', error);
          toast({
            title: "Erro na importação",
            description: error.message || "Erro ao processar o arquivo",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      reader.readAsDataURL(selectedFile);

    } catch (error: any) {
      console.error('Erro geral:', error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Importar Receitas do Excel</span>
        </CardTitle>
        <CardDescription>
          Importe receitas completas de um arquivo Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email do Cliente</Label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="cliente@exemplo.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo Excel</Label>
            <div className="relative">
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <Badge className="absolute right-2 top-2 bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {selectedFile.name}
                </Badge>
              )}
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O arquivo deve conter uma página (aba) para cada receita, com ingredientes, embalagens e modo de preparo.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleImport}
            disabled={loading || !clientEmail || !selectedFile}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar Receitas
              </>
            )}
          </Button>
        </div>

        {resultado && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Resultado da Importação</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {resultado.receitas_criadas}
                  </div>
                  <div className="text-sm text-muted-foreground">Receitas Criadas</div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {resultado.produtos_criados}
                  </div>
                  <div className="text-sm text-muted-foreground">Produtos Criados</div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {resultado.produtos_existentes}
                  </div>
                  <div className="text-sm text-muted-foreground">Produtos Existentes</div>
                </CardContent>
              </Card>
            </div>

            {resultado.erros && resultado.erros.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Erros encontrados:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {resultado.erros.map((erro: any, index: number) => (
                      <li key={index}>
                        {erro.receita}: {erro.erro}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
