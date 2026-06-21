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
import { Mail, RefreshCw, Menu, BookOpen, Sun, Moon, Globe } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppSupportButton } from '@/components/support/WhatsAppSupportButton';
import { SubscriptionStatusGate } from '@/components/subscription/SubscriptionStatusGate';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { t, i18n } = useTranslation();
  const { user, loading, emailVerified, resendConfirmation } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme || resolvedTheme || 'light';
  const location = useLocation();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [hasAuthFragment, setHasAuthFragment] = useState(false);
  const { toast } = useToast();

  const getPageInfo = (pathname: string) => {
    const pageMap: Record<string, string> = {
      '/': 'dashboard',
      '/estoque': 'estoque',
      '/estoque/movimentacoes': 'movimentacao',
      '/estoque/historico': 'estoque',
      '/estoque/perdas': 'estoque',
      '/relatorios/estoque': 'estoque',
      '/relatorios/perdas': 'estoque',
      '/movimentacao': 'movimentacao',
      '/custos': 'custos',
      '/precificacao': 'precificacao',
      '/perfil': 'perfil',
      '/receitas': 'receitas',
      '/planos': 'planos',
      '/tutorial': 'tutorial',
    };
    const key = pageMap[pathname];
    if (key) {
      const titleMap: Record<string, string> = {
        '/estoque/historico': 'Histórico Geral',
        '/estoque/perdas': 'Perdas',
        '/relatorios/estoque': 'Relatórios de Estoque',
        '/relatorios/perdas': 'Relatórios de Perdas',
      };
      return {
        title: titleMap[pathname] || t(`pages.${key}.title`),
        description: t(`pages.${key}.description`),
      };
    }
    return { title: 'CalculaAi', description: '' };
  };
  
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
        title: t('header.emailResent'),
        description: t('header.emailResentDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('header.emailResendError'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  if (loading || hasAuthFragment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">
            {hasAuthFragment ? t('header.processing') : t('header.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const pageInfo = getPageInfo(location.pathname);
  const currentLang = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en';

  return (
    <SidebarProvider>
      <SubscriptionStatusGate>
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

              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                  >
                    <Globe className="h-4.5 w-4.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup value={currentLang} onValueChange={handleLanguageChange}>
                    <DropdownMenuRadioItem value="pt-BR" className="cursor-pointer">
                      🇧🇷 Português (BR)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="en" className="cursor-pointer">
                      🇺🇸 English
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                  >
                    {currentTheme === 'dark' ? (
                      <Moon className="h-4.5 w-4.5 text-muted-foreground" />
                    ) : (
                      <Sun className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{currentTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}</TooltipContent>
              </Tooltip>
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
                <TooltipContent>{t('header.tutorial')}</TooltipContent>
              </Tooltip>
              <NotificationCenter />
            </div>
            
            {/* Confirmação de e-mail desativada no Supabase — banner removido */}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6 xl:max-w-[1280px] 2xl:max-w-[1480px] 2xl:px-8 3xl:max-w-[1680px] 3xl:px-10 4xl:max-w-[1880px] 4xl:px-12">
              {children}
            </div>
          </main>
        </div>

        <WhatsAppSupportButton />
      </div>
      </SubscriptionStatusGate>
    </SidebarProvider>
  );
};