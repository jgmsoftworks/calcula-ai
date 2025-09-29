import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, Settings, History, TrendingUp } from 'lucide-react';

export default function NotificacoesPainel() {
  const { notifications, unreadCount } = useNotifications();

  const typeIcons = {
    info: <Bell className="h-4 w-4 text-blue-500" />,
    warning: <TrendingUp className="h-4 w-4 text-amber-500" />,
    success: <Bell className="h-4 w-4 text-green-500" />,
    error: <Bell className="h-4 w-4 text-red-500" />
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays < 1) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return notificationDate.toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Central de Notificações</h1>
        <p className="text-muted-foreground">
          Configure e visualize suas notificações inteligentes
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
            {unreadCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Notificações
              </CardTitle>
              <CardDescription>
                Últimas {notifications.length} notificações recebidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação ainda</p>
                  <p className="text-sm">Configure as notificações para começar a receber alertas importantes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${
                        !notification.read ? 'border-primary/20 bg-primary/5' : 'border-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {typeIcons[notification.type]}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          
                          {!notification.read && (
                            <div className="pt-1">
                              <span className="inline-flex items-center text-xs text-primary font-medium">
                                • Nova
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}