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
import ResetPassword from "./pages/ResetPassword";
import Estoque from "./pages/Estoque";
import Custos from "./pages/Custos";
import Precificacao from "./pages/Precificacao";
import Receitas from "./pages/Receitas";
import Simulador from "./pages/Simulador";
import Planos from "./pages/Planos";
import Sugestoes from "./pages/Sugestoes";
import PerfilNegocio from "./pages/PerfilNegocio";
import NotFound from "./pages/NotFound";

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
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<AppLayout><Index /></AppLayout>} />
                <Route path="/estoque" element={<AppLayout><Estoque /></AppLayout>} />
                <Route path="/custos" element={<AppLayout><Custos /></AppLayout>} />
                <Route path="/precificacao" element={<AppLayout><Precificacao /></AppLayout>} />
                <Route path="/receitas" element={<AppLayout><Receitas /></AppLayout>} />
                <Route path="/simulador" element={<AppLayout><Simulador /></AppLayout>} />
                <Route path="/planos" element={<AppLayout><Planos /></AppLayout>} />
                <Route path="/sugestoes" element={<AppLayout><Sugestoes /></AppLayout>} />
                <Route path="/perfil" element={<AppLayout><PerfilNegocio /></AppLayout>} />
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
