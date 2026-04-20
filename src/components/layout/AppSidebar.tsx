import { NavLink, useLocation } from 'react-router-dom';
import {
  Calculator,
  Home,
  Package,
  LogOut,
  Building2,
  TrendingUp,
  ChefHat,
  Crown,
  Users,
  ArrowRightFromLine,
  ClipboardList,
  ChevronDown,
  History,
  Boxes,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user, isAdmin } = useAuth();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';

  const businessNavigationItems: Array<{
    title: string;
    url: string;
    icon: typeof Home;
    children?: { title: string; url: string; icon: typeof Home }[];
  }> = [
    { title: t('nav.dashboard'), url: '/', icon: Home },
    {
      title: t('nav.estoque'),
      url: '/estoque',
      icon: Package,
      children: [
        { title: 'Lista de Produtos', url: '/estoque/produtos', icon: Boxes },
        { title: 'Histórico Geral', url: '/estoque/historico', icon: History },
      ],
    },
    { title: t('nav.movimentacao'), url: '/movimentacao', icon: TrendingUp },
    { title: t('nav.receitas'), url: '/receitas', icon: ChefHat },
    { title: 'Ordens de Produção', url: '/ordens-producao', icon: ClipboardList },
    { title: t('nav.custos'), url: '/custos', icon: TrendingUp },
    { title: t('nav.precificacao'), url: '/precificacao', icon: Calculator },
  ];

  const businessItems = [
    { title: t('nav.perfil'), url: '/perfil', icon: Building2 },
    { title: t('nav.planos'), url: '/planos', icon: Crown },
  ];

  const adminNavigationItems: Array<{
    title: string;
    url: string;
    icon: typeof Home;
    children?: { title: string; url: string; icon: typeof Home }[];
  }> = [
    { title: t('nav.dashboard'), url: '/', icon: Home },
    { title: t('nav.usuarios'), url: '/admin-usuarios', icon: Users },
    { title: t('nav.afiliados'), url: '/afiliados', icon: Crown },
  ];

  const adminItems = [
    { title: t('nav.gerenciarUsuarios'), url: '/admin/usuarios', icon: Users },
    { title: t('nav.configuracoes'), url: '/admin-configuracoes', icon: Building2 },
  ];

  const navigationItems = isAdmin ? adminNavigationItems : businessNavigationItems;
  const toolsItems = isAdmin ? adminItems : businessItems;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: t('common.logout'),
        description: t('common.logoutDesc'),
      });
    } catch (error) {
      toast({
        title: t('common.logoutError'),
        description: t('common.logoutErrorDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar
      className={`${isCollapsed ? 'w-14' : 'w-64'} transition-smooth border-r-0`}
      collapsible="icon"
    >
      {/* Brand line at top */}
      <div className="brand-line w-full" />

      {/* Header */}
      <SidebarHeader className={`p-4 ${isCollapsed ? 'px-2' : 'px-5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'w-full'}`}>
          {isCollapsed ? (
            <img 
              src="/lovable-uploads/51eac01a-23f2-4ae9-b4d9-3185f48d4798.png" 
              alt="CalculaAi" 
              className="h-9 w-9 object-contain"
            />
          ) : (
            <div className="w-full space-y-2">
              <img 
                src="/lovable-uploads/0e811681-8a8b-43c8-a9cd-3f9b5fda38c5.png" 
                alt="CalculaAi - Precificação Inteligente" 
                className="h-9 w-full object-contain object-left"
              />
              {isAdmin && (
                <div className="flex items-center">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-brand text-white rounded-full">
                    Admin
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {/* Main Navigation */}
        <SidebarGroup className="py-2">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-3">
              {isAdmin ? t('nav.admin') : t('nav.menu')}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigationItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === '/'}
                        className={`
                          relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                          transition-all duration-200 group
                          ${active 
                            ? 'bg-primary text-primary-foreground shadow-brand' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                          ${isCollapsed ? 'justify-center px-2' : ''}
                        `}
                      >
                        <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? '' : 'group-hover:text-primary'} transition-colors`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup className="py-2">
          {!isCollapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-3">
              {isAdmin ? t('nav.sistema') : t('nav.settings')}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {toolsItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={`
                          relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                          transition-all duration-200 group
                          ${active 
                            ? 'bg-primary text-primary-foreground shadow-brand' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                          ${isCollapsed ? 'justify-center px-2' : ''}
                        `}
                      >
                        <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? '' : 'group-hover:text-primary'} transition-colors`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={`p-4 border-t border-border/30 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {!isCollapsed && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        )}
        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className={`w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 ${isCollapsed ? 'px-2' : 'justify-start'}`}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && t('nav.sair')}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
