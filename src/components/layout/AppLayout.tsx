import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Carregando aplicação...</p>
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
          <header className="h-16 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-4 lg:px-6">
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
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-7xl mx-auto p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};