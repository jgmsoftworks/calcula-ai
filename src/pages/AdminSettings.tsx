import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Database, 
  Shield, 
  Globe, 
  Server, 
  Users, 
  Activity,
  Download,
  Upload,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

const AdminSettings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalBackups: 0,
    systemHealth: 'unknown' as 'healthy' | 'warning' | 'error' | 'unknown'
  });
  const [loading, setLoading] = useState(true);

  const fetchSystemData = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      // Fetch basic system statistics
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('plan')
        .eq('is_admin', false);

      if (profilesError) throw profilesError;

      const { data: backups, error: backupsError } = await supabase
        .from('backup_history')
        .select('id, status')
        .order('created_at', { ascending: false })
        .limit(10);

      if (backupsError) console.error('Error fetching backups:', backupsError);

      setSystemStats({
        totalUsers: profiles?.length || 0,
        activeSubscriptions: profiles?.filter(p => p.plan !== 'free').length || 0,
        totalBackups: backups?.length || 0,
        systemHealth: 'healthy'
      });

    } catch (error) {
      console.error('Error fetching system data:', error);
      setSystemStats(prev => ({ ...prev, systemHealth: 'error' }));
      toast({
        title: "Erro ao carregar dados do sistema",
        description: "Algumas informações podem estar desatualizadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSystemData();
    }
  }, [isAdmin]);

  const handleCreateBackup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-backup', {
        body: { backup_type: 'manual' }
      });

      if (error) throw error;

      toast({
        title: "Backup iniciado",
        description: "O backup do sistema foi iniciado com sucesso",
      });

      // Refresh data after backup
      fetchSystemData();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Erro ao criar backup",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    }
  };

  const systemInfo = [
    {
      title: 'Usuários Totais',
      value: systemStats.totalUsers.toString(),
      description: 'Contas registradas',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Assinantes Ativos',
      value: systemStats.activeSubscriptions.toString(),
      description: 'Planos pagos',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Backups Recentes',
      value: systemStats.totalBackups.toString(),
      description: 'Últimos 10 backups',
      icon: Database,
      color: 'text-blue-600',
    },
    {
      title: 'Status do Sistema',
      value: systemStats.systemHealth === 'healthy' ? 'Saudável' : 'Problemas',
      description: 'Monitoramento geral',
      icon: systemStats.systemHealth === 'healthy' ? CheckCircle : AlertTriangle,
      color: systemStats.systemHealth === 'healthy' ? 'text-green-600' : 'text-yellow-600',
    },
  ];

  const systemActions = [
    {
      title: 'Criar Backup Manual',
      description: 'Backup completo do sistema',
      icon: Download,
      action: handleCreateBackup,
      variant: 'outline' as const,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Atualizar Estatísticas',
      description: 'Recarregar dados do sistema',
      icon: RefreshCcw,
      action: fetchSystemData,
      variant: 'outline' as const,
      gradient: 'from-primary to-secondary',
    },
    {
      title: 'Logs do Sistema',
      description: 'Visualizar logs de atividade',
      icon: Activity,
      action: () => {
        toast({
          title: "Em desenvolvimento",
          description: "Funcionalidade será implementada em breve",
        });
      },
      variant: 'outline' as const,
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent">
            Configurações do Sistema
          </h1>
          <p className="text-lg text-muted-foreground">
            Administração central e configurações globais
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-gradient-primary text-white border-0">
            <Shield className="h-3 w-3 mr-1" />
            Modo Administrador
          </Badge>
        </div>
      </div>

      {/* System Info Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {systemInfo.map((info) => {
          const Icon = info.icon;
          return (
            <Card key={info.title} className="border-0 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {info.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {info.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {info.description}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20">
                    <Icon className={`h-6 w-6 ${info.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Actions */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Ações do Sistema</span>
          </CardTitle>
          <CardDescription>
            Ferramentas de administração e manutenção do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {systemActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card key={action.title} className="relative overflow-hidden border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                  <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-5`}></div>
                  <CardContent className="relative p-6">
                    <div className="space-y-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${action.gradient} shadow-lg w-fit`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <Button 
                        variant={action.variant}
                        onClick={action.action}
                        className="w-full"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        Executar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Health Status */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Status do Sistema</span>
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos componentes do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Base de Dados</p>
                  <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Online
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Autenticação</p>
                  <p className="text-sm text-muted-foreground">Supabase Auth</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Online
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Edge Functions</p>
                  <p className="text-sm text-muted-foreground">Processamento serverless</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Online
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Sistema de Afiliados</p>
                  <p className="text-sm text-muted-foreground">Gestão de parcerias</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;