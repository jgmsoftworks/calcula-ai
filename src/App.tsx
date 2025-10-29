import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthSuccess from "./pages/AuthSuccess";
import Afiliados from "./pages/Afiliados";
import AuthStripeComplete from "./pages/AuthStripeComplete";
import ResetPassword from "./pages/ResetPassword";
import Estoque from "./pages/Estoque";
import Movimentacao from "./pages/Movimentacao";
import Fornecedores from "./pages/Fornecedores";
import Vitrine from "./pages/Vitrine";
import Custos from "./pages/Custos";
import Precificacao from "./pages/Precificacao";
import Receitas from "./pages/Receitas";
import Simulador from "./pages/Simulador";
import Planos from "./pages/Planos";
import Sugestoes from "./pages/Sugestoes";
import PerfilNegocio from "./pages/PerfilNegocio";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import Checkout from "./pages/Checkout";
import AffiliateRedirect from "./pages/AffiliateRedirect";
import AffiliatePlanSelector from "./pages/AffiliatePlanSelector";
import NotFound from "./pages/NotFound";
import MarketplaceFornecedores from "./pages/MarketplaceFornecedores";
import MeuPainelFornecedor from "./pages/MeuPainelFornecedor";
import NotificacoesPainel from "./pages/NotificacoesPainel";
import FornecedorDashboard from "./pages/FornecedorDashboard";
import FornecedorOrcamentos from "./pages/FornecedorOrcamentos";
import FornecedorProtectedRoute from "./components/FornecedorProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <ActivityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/success" element={<AuthSuccess />} />
            <Route path="/auth/stripe-complete" element={<AuthStripeComplete />} />
            <Route path="/checkout" element={<Checkout />} />
          <Route path="/ref/:code" element={<AffiliateRedirect />} />
          <Route path="/aff/:code" element={<AffiliateRedirect />} />
          <Route path="/affiliate/:code" element={<AffiliatePlanSelector />} />
            <Route path="/afiliados" element={<AppLayout><Afiliados /></AppLayout>} />
            <Route path="/admin/usuarios" element={<AppLayout><AdminUsers /></AppLayout>} />
            <Route path="/admin/settings" element={<AppLayout><AdminSettings /></AppLayout>} />
            <Route path="/admin-usuarios" element={<AppLayout><AdminUsers /></AppLayout>} />
            <Route path="/admin-configuracoes" element={<AppLayout><AdminSettings /></AppLayout>} />
            <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/estoque" element={<AppLayout><Estoque /></AppLayout>} />
          <Route path="/movimentacao" element={<AppLayout><Movimentacao /></AppLayout>} />
          <Route path="/fornecedores" element={<AppLayout><Fornecedores /></AppLayout>} />
          <Route path="/receitas" element={<AppLayout><Receitas /></AppLayout>} />
                <Route path="/vitrine" element={<AppLayout><Vitrine /></AppLayout>} />
                <Route path="/custos" element={<AppLayout><Custos /></AppLayout>} />
                <Route path="/precificacao" element={<AppLayout><Precificacao /></AppLayout>} />
                <Route path="/simulador" element={<AppLayout><Simulador /></AppLayout>} />
                <Route path="/planos" element={<AppLayout><Planos /></AppLayout>} />
                <Route path="/sugestoes" element={<AppLayout><Sugestoes /></AppLayout>} />
                <Route path="/perfil" element={<AppLayout><PerfilNegocio /></AppLayout>} />
                <Route path="/notificacoes" element={<AppLayout><NotificacoesPainel /></AppLayout>} />
                <Route path="/marketplace" element={<AppLayout><MarketplaceFornecedores /></AppLayout>} />
                <Route path="/meu-painel-fornecedor" element={<AppLayout><MeuPainelFornecedor /></AppLayout>} />
                
                {/* Fornecedor Routes */}
                <Route path="/fornecedor-dashboard" element={
                  <FornecedorProtectedRoute>
                    <AppLayout><FornecedorDashboard /></AppLayout>
                  </FornecedorProtectedRoute>
                } />
                <Route path="/fornecedor-orcamentos" element={
                  <FornecedorProtectedRoute>
                    <AppLayout><FornecedorOrcamentos /></AppLayout>
                  </FornecedorProtectedRoute>
                } />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ActivityProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
