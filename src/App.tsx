import '@/i18n';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { AppLayoutRoute } from "@/components/layout/AppLayoutRoute";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthSuccess from "./pages/AuthSuccess";
import Afiliados from "./pages/Afiliados";
import AuthStripeComplete from "./pages/AuthStripeComplete";
import ResetPassword from "./pages/ResetPassword";
import MediaFaturamentoPage from "./pages/precificacao/MediaFaturamentoPage";
import MarkupsPage from "./pages/precificacao/MarkupsPage";
import DespesasFixasPage from "./pages/precificacao/DespesasFixasPage";
import FolhaPagamentoPage from "./pages/precificacao/FolhaPagamentoPage";
import EncargosVendaPage from "./pages/precificacao/EncargosVendaPage";
import Estoque from "./pages/Estoque";
import EstoqueHistorico from "./pages/EstoqueHistorico";
import RelatoriosEstoque from "./pages/RelatoriosEstoque";
import RelatoriosPerdas from "./pages/RelatoriosPerdas";
import Perdas from "./pages/Perdas";
import Movimentacao from "./pages/Movimentacao";
import Receitas from "./pages/Receitas";
import AgendaPage from "./pages/producao/AgendaPage";
import CronogramaPage from "./pages/producao/CronogramaPage";
import Planos from "./pages/Planos";
import PerfilNegocio from "./pages/PerfilNegocio";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import AdminStripe from "./pages/AdminStripe";
import AdminInadimplencia from "./pages/AdminInadimplencia";
import Checkout from "./pages/Checkout";
import AffiliateRedirect from "./pages/AffiliateRedirect";
import AffiliatePlanSelector from "./pages/AffiliatePlanSelector";
import NotificacoesPainel from "./pages/NotificacoesPainel";
import Tutorial from "./pages/Tutorial";
import NotFound from "./pages/NotFound";
import MinhaPrivacidade from "./pages/MinhaPrivacidade";
import AdminSecurity from "./pages/AdminSecurity";
import PoliticaPrivacidade from "./pages/legal/PoliticaPrivacidade";
import TermosUso from "./pages/legal/TermosUso";
import PoliticaCookies from "./pages/legal/PoliticaCookies";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CookieBanner } from "@/components/legal/CookieBanner";

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
          <CookieConsentProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <CookieBanner />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/termos-de-uso" element={<TermosUso />} />
                <Route path="/cookies" element={<PoliticaCookies />} />
                <Route path="/auth/success" element={<AuthSuccess />} />
                <Route path="/auth/stripe-complete" element={<AuthStripeComplete />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/ref/:code" element={<AffiliateRedirect />} />
                <Route path="/aff/:code" element={<AffiliateRedirect />} />
                <Route path="/affiliate/:code" element={<AffiliatePlanSelector />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<AppLayoutRoute />}>
                  <Route path="/afiliados" element={<Afiliados />} />
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/stripe" element={<AdminStripe />} />
                  <Route path="/admin/inadimplencia" element={<AdminInadimplencia />} />
                  <Route path="/admin/security" element={<AdminSecurity />} />
                  <Route path="/admin-usuarios" element={<AdminUsers />} />
                  <Route path="/admin-configuracoes" element={<AdminSettings />} />
                  <Route path="/" element={<Index />} />
                  <Route path="/estoque" element={<Estoque />} />
                  <Route path="/estoque/movimentacoes" element={<Movimentacao />} />
                  <Route path="/estoque/historico" element={<EstoqueHistorico />} />
                  <Route path="/estoque/perdas" element={<Perdas />} />
                  <Route path="/estoque/relatorios" element={<Navigate to="/relatorios/estoque" replace />} />
                  <Route path="/relatorios" element={<Navigate to="/relatorios/estoque" replace />} />
                  <Route path="/relatorios/estoque" element={<RelatoriosEstoque />} />
                  <Route path="/relatorios/perdas" element={<RelatoriosPerdas />} />
                  <Route path="/receitas" element={<Receitas />} />
                  <Route path="/producao" element={<Navigate to="/producao/cronograma" replace />} />
                  <Route path="/producao/cronograma" element={<CronogramaPage />} />
                  <Route path="/producao/agenda" element={<AgendaPage />} />
                  <Route path="/movimentacao" element={<Navigate to="/estoque/movimentacoes" replace />} />
                  <Route path="/custos" element={<Navigate to="/precificacao/despesas-fixas" replace />} />
                  <Route path="/precificacao" element={<Navigate to="/precificacao/media-faturamento" replace />} />
                  <Route path="/precificacao/media-faturamento" element={<MediaFaturamentoPage />} />
                  <Route path="/precificacao/markups" element={<MarkupsPage />} />
                  <Route path="/precificacao/despesas-fixas" element={<DespesasFixasPage />} />
                  <Route path="/precificacao/folha-pagamento" element={<FolhaPagamentoPage />} />
                  <Route path="/precificacao/encargos-venda" element={<EncargosVendaPage />} />
                  <Route path="/planos" element={<Planos />} />
                  <Route path="/perfil" element={<PerfilNegocio />} />
                  <Route path="/notificacoes" element={<NotificacoesPainel />} />
                  <Route path="/tutorial" element={<Tutorial />} />
                  <Route path="/minha-privacidade" element={<MinhaPrivacidade />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </CookieConsentProvider>
        </ActivityProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
