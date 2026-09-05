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
import { CirclePlay, Sun, Moon, Globe, User, Building2, Crown, ShieldCheck, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppSupportButton } from '@/components/support/WhatsAppSupportButton';
import { SubscriptionStatusGate } from '@/components/subscription/SubscriptionStatusGate';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { t, i18n } = useTranslation();
  const { user, loading, emailVerified, resendConfirmation, signOut, isAdmin } = useAuth();
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
      '/relatorios/produtividade': 'receitas',
      '/movimentacao': 'movimentacao',
      '/custos': 'custos',
      '/precificacao': 'precificacao',
      '/precificacao/media-faturamento': 'precificacao',
      '/precificacao/markups': 'precificacao',
      '/precificacao/despesas-fixas': 'precificacao',
      '/precificacao/folha-pagamento': 'precificacao',
      '/precificacao/encargos-venda': 'precificacao',
      '/producao/agenda': 'receitas',
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
        '/relatorios/produtividade': 'Produtividade',
        '/producao/agenda': 'Agenda de Produção',
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({ title: t('common.logout'), description: t('common.logoutDesc') });
    } catch {
      toast({ title: t('common.logoutError'), description: t('common.logoutErrorDesc'), variant: 'destructive' });
    }
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
      <div className="flex min-h-svh w-full min-w-0 overflow-x-hidden bg-background">
        <AppSidebar />
        
        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          {/* Header — glass morphism */}
          <header className="glass-strong sticky top-0 z-30 border-b border-border/30">
            <div className="flex h-14 min-w-0 items-center gap-1 px-2.5 sm:gap-2 sm:px-4 lg:gap-3 lg:px-6">
              <SidebarTrigger
                className="h-10 w-10 shrink-0 md:hidden"
                aria-label="Abrir menu principal"
              />
              
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-sm font-semibold leading-tight text-foreground sm:text-base">
                  {pageInfo.title}
                </h2>
              </div>

              {/* Language Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 rounded-full sm:inline-flex"
                    aria-label="Alterar idioma"
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
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                    aria-label={currentTheme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
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
                    className="hidden h-9 w-9 rounded-full sm:inline-flex"
                    onClick={() => navigate('/tutorial')}
                    aria-label={t('header.tutorial')}
                  >
                    <CirclePlay className="h-4.5 w-4.5 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('header.tutorial')}</TooltipContent>
              </Tooltip>
              <NotificationCenter />

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full border-primary/20 bg-primary/5 hover:bg-primary/10"
                    aria-label="Abrir menu do usuário"
                  >
                    <User className="h-4.5 w-4.5 text-primary" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-64">
                  <DropdownMenuLabel className="py-3 font-normal">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/tutorial')} className="cursor-pointer gap-2.5 py-2.5 sm:hidden">
                    <CirclePlay className="h-4 w-4" /> {t('header.tutorial')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleLanguageChange(currentLang === 'pt-BR' ? 'en' : 'pt-BR')}
                    className="cursor-pointer gap-2.5 py-2.5 sm:hidden"
                  >
                    <Globe className="h-4 w-4" />
                    {currentLang === 'pt-BR' ? 'Mudar para English' : 'Mudar para Português'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="sm:hidden" />
                  {!isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/perfil')} className="cursor-pointer gap-2.5 py-2.5">
                        <Building2 className="h-4 w-4" /> Perfil do negócio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/planos')} className="cursor-pointer gap-2.5 py-2.5">
                        <Crown className="h-4 w-4" /> Planos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/minha-privacidade')} className="cursor-pointer gap-2.5 py-2.5">
                        <ShieldCheck className="h-4 w-4" /> Minha Privacidade
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => void handleSignOut()} className="cursor-pointer gap-2.5 py-2.5 text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Confirmação de e-mail desativada no Supabase — banner removido */}
          </header>

          {/* Main Content */}
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto w-full min-w-0 max-w-full px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:py-6 xl:max-w-[1280px] 2xl:max-w-[1480px] 2xl:px-8 3xl:max-w-[1680px] 3xl:px-10 4xl:max-w-[1880px] 4xl:px-12">
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

