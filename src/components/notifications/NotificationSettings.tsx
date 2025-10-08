import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, Package, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface NotificationSettings {
  low_stock: boolean;
  unpriced_recipes: boolean;
  cost_anomalies: boolean;
  sales_opportunities: boolean;
  engagement_reminders: boolean;
  low_margin_alerts: boolean;
}

export const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    low_stock: true,
    unpriced_recipes: true,
    cost_anomalies: true,
    sales_opportunities: true,
    engagement_reminders: true,
    low_margin_alerts: true
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', 'notification_settings')
        .single();

      if (data?.configuration) {
        setSettings({ ...settings, ...(data.configuration as any as NotificationSettings) });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_configurations')
        .upsert({
          user_id: user.id,
          type: 'notification_settings',
          configuration: settings as any
        });

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const notificationTypes = [
    {
      key: 'low_stock' as keyof NotificationSettings,
      title: 'Estoque Baixo',
      description: 'Alertas quando produtos atingirem o estoque mínimo',
      icon: <Package className="h-4 w-4" />,
      priority: 'Alta',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    },
    {
      key: 'unpriced_recipes' as keyof NotificationSettings,
      title: 'Receitas Sem Preço',
      description: 'Lembretes para receitas que precisam de precificação',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 'Média',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    },
    {
      key: 'cost_anomalies' as keyof NotificationSettings,
      title: 'Anomalias de Custo',
      description: 'Variações significativas (>30%) no custo de produtos nos últimos 7 dias',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 'Alta',
      color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
    },
    {
      key: 'sales_opportunities' as keyof NotificationSettings,
      title: 'Oportunidades de Venda',
      description: 'Produtos com alta demanda mas estoque baixo - não perca vendas!',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 'Média',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    },
    {
      key: 'low_margin_alerts' as keyof NotificationSettings,
      title: 'Margem de Lucro Baixa',
      description: 'Receitas com margem inferior a 20% - revise preços ou custos',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 'Média',
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
    },
    {
      key: 'engagement_reminders' as keyof NotificationSettings,
      title: 'Lembretes de Atividade',
      description: 'Sugestões quando você ficar mais de 7 dias sem acessar o sistema',
      icon: <Calendar className="h-4 w-4" />,
      priority: 'Baixa',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {type.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={type.key} className="font-medium cursor-pointer">
                      {type.title}
                    </Label>
                    <Badge variant="outline" className={type.color}>
                      {type.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {type.description}
                  </p>
                </div>
              </div>
              <Switch
                id={type.key}
                checked={settings[type.key]}
                onCheckedChange={() => handleToggle(type.key)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={saveSettings} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Bell className="h-4 w-4 mt-0.5 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">🔔 Sistema de Notificações Inteligentes</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• <strong>Análise automática</strong>: Verificação diária de padrões e anomalias</li>
                <li>• <strong>Sem spam</strong>: Máximo 1 notificação por tipo por dia</li>
                <li>• <strong>Insights acionáveis</strong>: Apenas alertas relevantes para seu negócio</li>
                <li>• <strong>Limpeza automática</strong>: Notificações antigas removidas após 30 dias</li>
                <li>• <strong>Personalização total</strong>: Ative apenas o que importa para você</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary mb-2">💡 Dica Pro</p>
          <p className="text-sm text-muted-foreground">
            Recomendamos manter <strong>Anomalias de Custo</strong> e <strong>Oportunidades de Venda</strong> ativadas. 
            Elas podem aumentar sua lucratividade em até 25% ao identificar problemas antes que virem prejuízo!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};