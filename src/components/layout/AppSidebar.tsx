import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Calculator,
  Home,
  Package,
  LogOut,
  Building2,
  TrendingUp,
  ChefHat,
  MessageSquare,
  Crown,
  DollarSign,
  Store,
  Users,
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

// Items for regular business users
const businessNavigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'Receitas', url: '/receitas', icon: ChefHat },
  { title: 'Vitrine', url: '/vitrine', icon: Store },
  { title: 'Custos', url: '/custos', icon: TrendingUp },
  { title: 'Precificação', url: '/precificacao', icon: Calculator },
  { title: 'Simulador', url: '/simulador', icon: DollarSign },
  { title: 'Marketplace', url: '/marketplace', icon: Package },
  { title: 'Sugestões', url: '/sugestoes', icon: MessageSquare },
];

const businessItems = [
  { title: 'Perfil de Negócio', url: '/perfil', icon: Building2 },
  { title: 'Painel Fornecedor', url: '/meu-painel-fornecedor', icon: Store },
  { title: 'Planos', url: '/planos', icon: Crown },
];

// Items for admin users
const adminNavigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Usuários', url: '/admin-usuarios', icon: Users },
  { title: 'Afiliados', url: '/afiliados', icon: Crown },
  { title: 'Sugestões', url: '/sugestoes', icon: MessageSquare },
];

const adminItems = [
  { title: 'Configurações', url: '/admin-configuracoes', icon: Building2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user, isAdmin } = useAuth();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';

  // Select navigation items based on admin status
  const navigationItems = isAdmin ? adminNavigationItems : businessNavigationItems;
  const toolsItems = isAdmin ? adminItems : businessItems;

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return isActive(path)
      ? 'bg-gradient-primary text-white shadow-soft font-medium'
      : 'hover:bg-muted/50 transition-smooth text-foreground';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar
      className={`${isCollapsed ? 'w-14' : 'w-64'} sidebar-premium transition-smooth`}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-sidebar-border bg-gradient-to-b from-sidebar-background to-sidebar-background/80">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'w-full'}`}>
          {isCollapsed ? (
            <img 
              src="/lovable-uploads/51eac01a-23f2-4ae9-b4d9-3185f48d4798.png" 
              alt="CalculaAi" 
              className="h-10 w-10 object-contain"
            />
          ) : (
            <div className="w-full">
              <img 
                src="/lovable-uploads/0e811681-8a8b-43c8-a9cd-3f9b5fda38c5.png" 
                alt="CalculaAi - Precificação Inteligente" 
                className="h-10 w-full object-contain object-left"
              />
              {isAdmin && (
                <div className="mt-2 flex items-center justify-center">
                  <span className="px-2 py-1 text-xs font-bold bg-gradient-primary text-white rounded-full shadow-glow">
                    ADMIN MASTER
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            {isAdmin ? 'Administração' : 'Navegação Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/'}
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            {isAdmin ? 'Sistema' : 'Ferramentas de Negócio'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={getNavClassName(item.url)}
                    >
                      <item.icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-background to-sidebar-background/80">
        {!isCollapsed && (
          <div className="space-y-2 mb-3">
            <p className="text-sm font-medium text-foreground">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.user_metadata?.business_name || 'Negócio'}
            </p>
          </div>
        )}
        <Button
          onClick={handleSignOut}
          variant={isCollapsed ? "ghost" : "outline"}
          className={`w-full ${isCollapsed ? 'px-2' : 'justify-start'}`}
        >
          <LogOut className={`h-4 w-4 ${isCollapsed ? '' : 'mr-2'}`} />
          {!isCollapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}