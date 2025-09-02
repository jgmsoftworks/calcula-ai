import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Calculator,
  Home,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  TrendingUp,
  FileText,
  Users
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

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Produtos', url: '/produtos', icon: Package },
  { title: 'Precificação', url: '/precificacao', icon: Calculator },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
  { title: 'Clientes', url: '/clientes', icon: Users },
];

const businessItems = [
  { title: 'Perfil do Negócio', url: '/perfil', icon: Building2 },
  { title: 'Análise de Custos', url: '/custos', icon: TrendingUp },
  { title: 'Documentos', url: '/documentos', icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === 'collapsed';

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
      className={`${isCollapsed ? 'w-14' : 'w-64'} border-r bg-card transition-smooth`}
      collapsible="icon"
    >
      {/* Header */}
      <SidebarHeader className="p-4 border-b">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'w-full'}`}>
          {isCollapsed ? (
            <img 
              src="/lovable-uploads/51eac01a-23f2-4ae9-b4d9-3185f48d4798.png" 
              alt="CalculaAi" 
              className="h-10 w-10 object-contain"
            />
          ) : (
            <img 
              src="/lovable-uploads/0e811681-8a8b-43c8-a9cd-3f9b5fda38c5.png" 
              alt="CalculaAi - Precificação Inteligente" 
              className="h-10 w-full object-contain object-left"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Navegação Principal
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

        {/* Business Tools */}
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Ferramentas de Negócio
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {businessItems.map((item) => (
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

        {/* Settings */}
        <SidebarGroup className="py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/configuracoes"
                    className={getNavClassName('/configuracoes')}
                  >
                    <Settings className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                    {!isCollapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t">
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