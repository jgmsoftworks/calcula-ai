import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Link2, TrendingUp, DollarSign } from "lucide-react";
import { AffiliatesList } from "@/components/afiliados/AffiliatesList";
import { AffiliatesDashboard } from "@/components/afiliados/AffiliatesDashboard";
import { AffiliatesLinks } from "@/components/afiliados/AffiliatesLinks";
import { AffiliatesSales } from "@/components/afiliados/AffiliatesSales";
import { AffiliatesCommissions } from "@/components/afiliados/AffiliatesCommissions";
import { AffiliateSystemSettings } from "@/components/afiliados/AffiliateSystemSettings";
import { AffiliatePaymentSystem } from "@/components/afiliados/AffiliatePaymentSystem";
import { AffiliateCoupons } from "@/components/afiliados/AffiliateCoupons";
import { PromotionalCoupons } from "@/components/afiliados/PromotionalCoupons";
import { AffiliatesReports } from "@/components/afiliados/AffiliatesReports";
import { AdminActions } from "@/components/afiliados/AdminActions";
import { useAffiliates } from "@/hooks/useAffiliates";

export default function Afiliados() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { affiliatesStats } = useAffiliates();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sistema de Afiliados</h1>
        <p className="text-muted-foreground">
          Gerencie afiliados, links de venda e comissões
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Afiliados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliatesStats.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {affiliatesStats.activeAffiliates} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Links Ativos</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliatesStats.totalLinks}</div>
            <p className="text-xs text-muted-foreground">
              Links de afiliação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {affiliatesStats.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {affiliatesStats.totalSalesCount} vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {affiliatesStats.totalCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              A pagar este mês
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-11 text-xs">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="afiliados">Afiliados</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="cupons">Cupons Afil.</TabsTrigger>
          <TabsTrigger value="cupons-promo">Cupons Promo</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="configuracoes">Config</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <AffiliatesDashboard />
        </TabsContent>
        
        <TabsContent value="afiliados" className="space-y-4">
          <AffiliatesList />
        </TabsContent>
        
        <TabsContent value="links" className="space-y-4">
          <AffiliatesLinks />
        </TabsContent>
        
        <TabsContent value="cupons" className="space-y-4">
          <AffiliateCoupons />
        </TabsContent>
        
        <TabsContent value="cupons-promo" className="space-y-4">
          <PromotionalCoupons />
        </TabsContent>
        
        <TabsContent value="vendas" className="space-y-4">
          <AffiliatesSales />
        </TabsContent>
        
        <TabsContent value="comissoes" className="space-y-4">
          <AffiliatesCommissions />
        </TabsContent>
        
        <TabsContent value="pagamentos" className="space-y-4">
          <AffiliatePaymentSystem />
        </TabsContent>
        
        <TabsContent value="relatorios" className="space-y-4">
          <AffiliatesReports />
        </TabsContent>
        
        <TabsContent value="admin" className="space-y-4">
          <AdminActions />
        </TabsContent>
        
        <TabsContent value="configuracoes" className="space-y-4">
          <AffiliateSystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}