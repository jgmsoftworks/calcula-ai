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
  outdated_markups: boolean;
  weekly_reports: boolean;
  sales_goals: boolean;
}

export const NotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    low_stock: true,
    unpriced_recipes: true,
    outdated_markups: false,
    weekly_reports: false,
    sales_goals: false
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
      description: 'Ser notificado quando produtos atingirem o estoque mínimo',
      icon: <Package className="h-4 w-4" />,
      priority: 'Alta',
      color: 'bg-red-100 text-red-700'
    },
    {
      key: 'unpriced_recipes' as keyof NotificationSettings,
      title: 'Receitas Sem Preço',
      description: 'Alertas para receitas que precisam de precificação',
      icon: <DollarSign className="h-4 w-4" />,
      priority: 'Média',
      color: 'bg-amber-100 text-amber-700'
    },
    {
      key: 'outdated_markups' as keyof NotificationSettings,
      title: 'Markups Desatualizados',
      description: 'Avisos sobre markups que não são atualizados há mais de 30 dias',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 'Baixa',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      key: 'weekly_reports' as keyof NotificationSettings,
      title: 'Relatórios Semanais',
      description: 'Resumo semanal da performance do negócio',
      icon: <Calendar className="h-4 w-4" />,
      priority: 'Informativa',
      color: 'bg-green-100 text-green-700'
    },
    {
      key: 'sales_goals' as keyof NotificationSettings,
      title: 'Metas de Vendas',
      description: 'Progresso das metas de vendas mensais',
      icon: <TrendingUp className="h-4 w-4" />,
      priority: 'Média',
      color: 'bg-purple-100 text-purple-700'
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
              <p className="font-medium">Como funcionam as notificações?</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Notificações são verificadas automaticamente todos os dias</li>
                <li>• Você não receberá notificações duplicadas no mesmo dia</li>
                <li>• Notificações antigas são removidas após 30 dias</li>
                <li>• Configure apenas as que são relevantes para seu negócio</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};