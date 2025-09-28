import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Database, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AdminActions() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    syncedSales: number;
    errors: number;
    totalSessions: number;
  } | null>(null);

  const syncAffiliateSales = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-affiliate-sales');

      if (error) {
        throw error;
      }

      setSyncResult(data);
      toast({
        title: "Sincronização Concluída",
        description: `${data.syncedSales} vendas sincronizadas de ${data.totalSessions} sessões analisadas`
      });
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast({
        title: "Erro",
        description: "Erro ao sincronizar vendas",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronização de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sincroniza vendas do Stripe que podem não ter sido registradas automaticamente,
            incluindo vendas com cupons de 100% de desconto.
          </p>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={syncAffiliateSales} 
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Vendas'}
            </Button>
            
            {syncResult && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {syncResult.syncedSales} sincronizadas
                </Badge>
                
                {syncResult.errors > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {syncResult.errors} erros
                  </Badge>
                )}
                
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {syncResult.totalSessions} sessões analisadas
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">Como funciona:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Analisa as últimas 100 sessões completas do Stripe (últimos 30 dias)</li>
              <li>Identifica vendas com códigos de afiliado que não foram registradas</li>
              <li>Cria registros de vendas e comissões automaticamente</li>
              <li>Atualiza contadores de conversão dos links</li>
              <li>Atualiza totais dos afiliados</li>
            </ul>
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-orange-800">Importante:</p>
                <p className="text-orange-700">
                  Esta sincronização é segura e não cria duplicatas. Execute sempre que 
                  suspeitar que vendas não foram registradas automaticamente.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}