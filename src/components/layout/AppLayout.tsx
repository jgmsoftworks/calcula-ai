import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useMarkupInitializer } from '@/hooks/useMarkupInitializer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Mail, RefreshCw, Menu, BookOpen, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppSupportButton } from '@/components/support/WhatsAppSupportButton';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getPageInfo = (pathname: string): { title: string; description: string; } => {
  const pageMap: Record<string, { title: string; description: string; }> = {
    '/': { title: 'Dashboard', description: 'Visão geral do seu negócio' },
    '/estoque': { title: 'Estoque', description: 'Gerencie seus produtos' },
    '/movimentacao': { title: 'Movimentações', description: 'Entradas e saídas' },
    '/custos': { title: 'Custos', description: 'Despesas, folha e encargos' },
    '/precificacao': { title: 'Precificação', description: 'Defina seus preços' },
    '/perfil': { title: 'Perfil', description: 'Configurações da empresa' },
    '/receitas': { title: 'Receitas', description: 'Monte e precifique receitas' },
    '/planos': { title: 'Planos', description: 'Gerencie sua assinatura' },
    '/tutorial': { title: 'Tutorial', description: 'Aprenda a usar o sistema' },
  };
  
  return pageMap[pathname] || { title: 'CalculaAi', description: '' };
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading, emailVerified, resendConfirmation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasAuthFragment, setHasAuthFragment] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const fragment = window.location.hash;
    if (fragment.includes('access_token') || fragment.includes('error')) {
      setHasAuthFragment(true);
      const timer = setTimeout(() => setHasAuthFragment(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  useMarkupInitializer();

  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    
    setIsResending(true);
    try {
      const { error } = await resendConfirmation(user.email);
      if (error) throw error;
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
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">
            {hasAuthFragment ? "Processando autenticação..." : "Carregando..."}
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
          {/* Header — glass morphism */}
          <header className="glass-strong sticky top-0 z-30 border-b border-border/30">
            <div className="h-14 flex items-center px-4 lg:px-6 gap-3">
              <SidebarTrigger className="lg:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              
              <div className="flex-1">
                <h2 className="text-base font-semibold font-display text-foreground leading-tight">
                  {pageInfo.title}
                </h2>
              </div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => navigate('/tutorial')}
                  >
                    <BookOpen className="h-4.5 w-4.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tutorial</TooltipContent>
              </Tooltip>
              <NotificationCenter />
            </div>
            
            {/* Email Verification Alert */}
            {user && !emailVerified && (
              <div className="px-4 pb-3">
                <Alert className="border-orange/30 bg-orange/5 text-foreground">
                  <Mail className="h-4 w-4 text-orange" />
                  <AlertDescription className="flex items-center justify-between text-sm">
                    <span>Confirme seu email para acesso completo.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="ml-2 h-7 text-xs border-orange/30 hover:bg-orange/10"
                    >
                      {isResending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        "Reenviar"
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>

        <WhatsAppSupportButton />
      </div>
    </SidebarProvider>
  );
};
