import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/hooks/useAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case '/':
      return { title: 'Dashboard', description: 'Visão geral do seu negócio' };
    case '/estoque':
      return { title: 'Estoque', description: 'Gerencie produtos, fornecedores e movimentações de estoque' };
    case '/custos':
      return { title: 'Gestão de Custos', description: 'Controle de despesas, folha e encargos' };
    default:
      return { title: 'CalculaAi Dashboard', description: '' };
  }
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const pageInfo = getPageInfo(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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