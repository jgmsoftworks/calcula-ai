import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemSettings {
  default_commission_percentage: number;
  default_commission_type: 'percentage' | 'fixed';
  default_commission_fixed_amount: number;
  cookie_tracking_period_days: number;
  grace_period_days: number;
  min_payout_amount: number;
  auto_approve_payouts: boolean;
  anti_fraud_enabled: boolean;
  max_clicks_per_hour: number;
  require_email_verification: boolean;
}

export function AffiliateSystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>({
    default_commission_percentage: 10,
    default_commission_type: 'percentage',
    default_commission_fixed_amount: 0,
    cookie_tracking_period_days: 30,
    grace_period_days: 7,
    min_payout_amount: 50,
    auto_approve_payouts: false,
    anti_fraud_enabled: true,
    max_clicks_per_hour: 100,
    require_email_verification: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_configurations')
        .select('*')
        .eq('type', 'affiliate_system_settings')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.configuration) {
        setSettings({ ...settings, ...data.configuration as any });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_configurations')
        .upsert({
          user_id: user?.id!,
          type: 'affiliate_system_settings',
          configuration: settings as any
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema de Afiliados</CardTitle>
          <CardDescription>
            Configure as regras globais para o programa de afiliados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurações de Comissão Padrão */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Comissões Padrão</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default_commission_percentage">Percentual Padrão (%)</Label>
                <Input
                  id="default_commission_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.default_commission_percentage}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_commission_percentage: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="default_commission_fixed_amount">Valor Fixo Padrão (R$)</Label>
                <Input
                  id="default_commission_fixed_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.default_commission_fixed_amount}
                  onChange={(e) => setSettings({
                    ...settings,
                    default_commission_fixed_amount: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações de Rastreamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Rastreamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cookie_tracking_period_days">Período de Cookie (dias)</Label>
                <Input
                  id="cookie_tracking_period_days"
                  type="number"
                  min="1"
                  max="365"
                  value={settings.cookie_tracking_period_days}
                  onChange={(e) => setSettings({
                    ...settings,
                    cookie_tracking_period_days: parseInt(e.target.value) || 30
                  })}
                />
              </div>
              <div>
                <Label htmlFor="grace_period_days">Período de Carência (dias)</Label>
                <Input
                  id="grace_period_days"
                  type="number"
                  min="0"
                  max="90"
                  value={settings.grace_period_days}
                  onChange={(e) => setSettings({
                    ...settings,
                    grace_period_days: parseInt(e.target.value) || 7
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações de Pagamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Pagamentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_payout_amount">Valor Mínimo para Saque (R$)</Label>
                <Input
                  id="min_payout_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.min_payout_amount}
                  onChange={(e) => setSettings({
                    ...settings,
                    min_payout_amount: parseFloat(e.target.value) || 50
                  })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_approve_payouts"
                  checked={settings.auto_approve_payouts}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    auto_approve_payouts: checked
                  })}
                />
                <Label htmlFor="auto_approve_payouts">Auto-aprovar Pagamentos</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configurações Anti-Fraude */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Anti-Fraude</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="anti_fraud_enabled"
                  checked={settings.anti_fraud_enabled}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    anti_fraud_enabled: checked
                  })}
                />
                <Label htmlFor="anti_fraud_enabled">Ativar Sistema Anti-Fraude</Label>
              </div>
              
              {settings.anti_fraud_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_clicks_per_hour">Máx. Cliques por Hora</Label>
                    <Input
                      id="max_clicks_per_hour"
                      type="number"
                      min="1"
                      value={settings.max_clicks_per_hour}
                      onChange={(e) => setSettings({
                        ...settings,
                        max_clicks_per_hour: parseInt(e.target.value) || 100
                      })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require_email_verification"
                      checked={settings.require_email_verification}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        require_email_verification: checked
                      })}
                    />
                    <Label htmlFor="require_email_verification">Verificar Email</Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}