import { lazy, Suspense } from 'react';
import { AcquisitionReturn } from '@/components/AcquisitionReturn';
import '@/i18n';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ActivityProvider } from "@/contexts/ActivityContext";
import ScrollToTop from "@/components/ScrollToTop";
import Auth from "./pages/Auth";
import { CookieConsentProvider } from "@/hooks/useCookieConsent";
import { CookieBanner } from "@/components/legal/CookieBanner";

const AppLayoutRoute = lazy(() => import("@/components/layout/AppLayoutRoute"));
const Index = lazy(() => import("./pages/Index"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const Afiliados = lazy(() => import("./pages/Afiliados"));
const AuthStripeComplete = lazy(() => import("./pages/AuthStripeComplete"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MediaFaturamentoPage = lazy(() => import("./pages/precificacao/MediaFaturamentoPage"));
const MarkupsPage = lazy(() => import("./pages/precificacao/MarkupsPage"));
const DespesasFixasPage = lazy(() => import("./pages/precificacao/DespesasFixasPage"));
const FolhaPagamentoPage = lazy(() => import("./pages/precificacao/FolhaPagamentoPage"));
const EncargosVendaPage = lazy(() => import("./pages/precificacao/EncargosVendaPage"));
const Estoque = lazy(() => import("./pages/Estoque"));
const EstoqueHistorico = lazy(() => import("./pages/EstoqueHistorico"));
const RelatoriosEstoque = lazy(() => import("./pages/RelatoriosEstoque"));
const RelatoriosPerdas = lazy(() => import("./pages/RelatoriosPerdas"));
const RelatoriosProdutividade = lazy(() => import("./pages/RelatoriosProdutividade"));
const Perdas = lazy(() => import("./pages/Perdas"));
const Movimentacao = lazy(() => import("./pages/Movimentacao"));
const Receitas = lazy(() => import("./pages/Receitas"));
const AgendaPage = lazy(() => import("./pages/producao/AgendaPage"));
const AgendaDayPage = lazy(() => import("./pages/producao/AgendaDayPage"));
const CronogramaPage = lazy(() => import("./pages/producao/CronogramaPage"));
const ProducaoCompartilhadaPage = lazy(() => import("./pages/producao/ProducaoCompartilhadaPage"));
const Planos = lazy(() => import("./pages/Planos"));
const PerfilNegocio = lazy(() => import("./pages/PerfilNegocio"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminStripe = lazy(() => import("./pages/AdminStripe"));
const AdminPlanos = lazy(() => import("./pages/AdminPlanos"));
const AdminInadimplencia = lazy(() => import("./pages/AdminInadimplencia"));
const Checkout = lazy(() => import("./pages/Checkout"));
const AffiliateRedirect = lazy(() => import("./pages/AffiliateRedirect"));
const AffiliatePlanSelector = lazy(() => import("./pages/AffiliatePlanSelector"));
const NotificacoesPainel = lazy(() => import("./pages/NotificacoesPainel"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MinhaPrivacidade = lazy(() => import("./pages/MinhaPrivacidade"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const PoliticaPrivacidade = lazy(() => import("./pages/legal/PoliticaPrivacidade"));
const TermosUso = lazy(() => import("./pages/legal/TermosUso"));
const PoliticaCookies = lazy(() => import("./pages/legal/PoliticaCookies"));

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
              <AcquisitionReturn />
              <CookieBanner />
              <Suspense fallback={<div role="status" className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Carregando…</div>}>
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
                <Route path="/producao-compartilhada/:token" element={<ProducaoCompartilhadaPage />} />
                <Route element={<AppLayoutRoute />}>
                  <Route path="/afiliados" element={<Afiliados />} />
                  <Route path="/admin/usuarios" element={<AdminUsers />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/stripe" element={<AdminStripe />} />
                  <Route path="/admin/planos" element={<AdminPlanos />} />
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
                  <Route path="/relatorios/produtividade" element={<RelatoriosProdutividade />} />
                  <Route path="/receitas" element={<Receitas />} />
                  <Route path="/producao" element={<Navigate to="/producao/cronograma" replace />} />
                  <Route path="/producao/cronograma" element={<CronogramaPage />} />
                  <Route path="/producao/agenda" element={<AgendaPage />} />
                  <Route path="/producao/agenda/:date" element={<AgendaDayPage />} />
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
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </CookieConsentProvider>
        </ActivityProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;



