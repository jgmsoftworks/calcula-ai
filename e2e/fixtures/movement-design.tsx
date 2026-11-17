import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '../../src/hooks/useAuth';
import Movimentacao from '../../src/pages/Movimentacao';
import { TiposProdutoModal } from '../../src/components/receitas/TiposProdutoModal';
import { Button } from '../../src/components/ui/button';
import '../../src/index.css';
import '../../src/i18n';
const auth: AuthContextType = { user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' }, session: null, loading: false, emailVerified: true, isAdmin: false, isFornecedor: false, signUp: async () => ({ data: { user: null, session: null }, error: null }), signIn: async () => ({ error: null }), signInWithGoogle: async () => ({ error: null, openedInNewTab: false }), signOut: async () => {}, resetPassword: async () => ({ error: null }), resendConfirmation: async () => ({ error: null }) };
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export default function Fixture() {
  const [open, setOpen] = useState(false);
  return <AuthContext.Provider value={auth}><QueryClientProvider client={client}><main className="mx-auto max-w-[1580px] p-4 sm:p-7"><header className="mb-6 flex items-center justify-between gap-3"><h1 className="text-xl font-semibold">Movimentação</h1><Button variant="outline" onClick={() => setOpen(true)}>Gerenciar tipos</Button></header><Movimentacao /><TiposProdutoModal open={open} onOpenChange={setOpen} /></main></QueryClientProvider></AuthContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
