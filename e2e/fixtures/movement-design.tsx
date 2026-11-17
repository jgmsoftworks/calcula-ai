import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '../../src/hooks/useAuth';
import { AppLayout } from '../../src/components/layout/AppLayout';
import Movimentacao from '../../src/pages/Movimentacao';
import { TiposProdutoModal } from '../../src/components/receitas/TiposProdutoModal';
import '../../src/index.css';
import '../../src/i18n';
const auth: AuthContextType = { user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' }, session: null, loading: false, emailVerified: true, isAdmin: false, isFornecedor: false, signUp: async () => ({ data: { user: null, session: null }, error: null }), signIn: async () => ({ error: null }), signInWithGoogle: async () => ({ error: null, openedInNewTab: false }), signOut: async () => {}, resetPassword: async () => ({ error: null }), resendConfirmation: async () => ({ error: null }) };
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export default function Fixture() {
  const [open, setOpen] = useState(new URLSearchParams(window.location.search).has('types'));
  return <AuthContext.Provider value={auth}><QueryClientProvider client={client}><MemoryRouter initialEntries={['/estoque/movimentacoes']}><AppLayout>
    <Routes>
      <Route path="/estoque/movimentacoes" element={<Movimentacao />} />
      <Route path="/receitas" element={<div><p>Lista de receitas de teste</p><div style={{ height: 1800 }} /><p>Fim da lista de receitas de teste</p></div>} />
    </Routes>
    <TiposProdutoModal open={open} onOpenChange={setOpen} />
  </AppLayout></MemoryRouter></QueryClientProvider></AuthContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
