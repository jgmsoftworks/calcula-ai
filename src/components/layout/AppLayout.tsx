import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useMarkupInitializer } from '@/hooks/useMarkupInitializer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppSupportButton } from '@/components/support/WhatsAppSupportButton';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getPageInfo = (pathname: string): { title: string; description: string; } => {
  const pageMap: Record<string, { title: string; description: string; }> = {
    '/': { title: 'Dashboard Executivo', description: 'Indicadores estratégicos e performance do seu negócio' },
    '/estoque': { title: 'Gestão de Estoque', description: 'Controle produtos, fornecedores e movimentações' },
    '/custos': { title: 'Centro de Custos', description: 'Controle financeiro completo: despesas, folha e encargos operacionais' },
    '/precificacao': { title: 'Estratégia de Preços', description: 'Defina preços competitivos com margem de lucro otimizada' },
    '/perfil': { title: 'Perfil do Negócio', description: 'Informações e configurações da empresa' }
  };
  
  return pageMap[pathname] || { title: 'CalculaAi Dashboard', description: '' };
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading, emailVerified, resendConfirmation } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasAuthFragment, setHasAuthFragment] = useState(false);
  const { toast } = useToast();
  
  // Check if URL contains OAuth fragments
  useEffect(() => {
    const fragment = window.location.hash;
    if (fragment.includes('access_token') || fragment.includes('error')) {
      setHasAuthFragment(true);
      // Give extra time for Supabase to process OAuth tokens
      const timer = setTimeout(() => setHasAuthFragment(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Inicializar markups automaticamente quando o usuário estiver logado
  useMarkupInitializer();

  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    try {
      const { error } = await resendConfirmation(user.email);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada e pasta de spam.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar email",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || !isReady || hasAuthFragment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">
            {hasAuthFragment ? "Processando autenticação..." : "Carregando aplicação..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const pageInfo = getPageInfo(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="h-16 flex items-center px-4 lg:px-6">
              <SidebarTrigger className="lg:hidden" />
              
              {/* Header content can be customized per page */}
              <div className="flex-1 ml-4 lg:ml-0">
                <h2 className="text-lg font-semibold text-foreground">
                  {pageInfo.title}
                </h2>
                {pageInfo.description && (
                  <p className="text-sm text-muted-foreground">
                    {pageInfo.description}
                  </p>
                )}
              </div>
              
              {/* Notification Center */}
              <div className="flex items-center">
                <NotificationCenter />
              </div>
            </div>
            
            {/* Email Verification Alert */}
            {user && !emailVerified && (
              <Alert className="mx-4 mb-4 border-amber-200 bg-amber-50 text-amber-800">
                <Mail className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Confirme seu email para ter acesso completo às funcionalidades.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="ml-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    {isResending ? (
                      <div className="flex items-center space-x-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>Reenviar</span>
                      </div>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>

        {/* Botão de Suporte WhatsApp - aparece em todas as telas */}
        <WhatsAppSupportButton />
      </div>
    </SidebarProvider>
  );
};