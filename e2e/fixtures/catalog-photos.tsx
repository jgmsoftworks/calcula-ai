import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '../../src/hooks/useAuth';
import { MarcasSelector } from '../../src/components/estoque/MarcasSelector';
import { CategoriasSelector } from '../../src/components/estoque/CategoriasSelector';
import { Toaster } from '../../src/components/ui/toaster';
import '../../src/index.css';
import '../../src/i18n';
const auth: AuthContextType = { user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' }, session: null, loading: false, emailVerified: true, isAdmin: false, isFornecedor: false, signUp: async () => ({ data: { user: null, session: null }, error: null }), signIn: async () => ({ error: null }), signInWithGoogle: async () => ({ error: null, openedInNewTab: false }), signOut: async () => {}, resetPassword: async () => ({ error: null }), resendConfirmation: async () => ({ error: null }) };
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
export default function Fixture() {
  const [values, setValues] = useState<string[]>([]);
  const [submits, setSubmits] = useState(0);
  const marca = new URLSearchParams(location.search).get('catalog') === 'marcas';
  return <AuthContext.Provider value={auth}><QueryClientProvider client={client}>
    <main className="mx-auto max-w-xl p-6"><form onSubmit={event => { event.preventDefault(); setSubmits(value => value + 1); }}>
      <h1 className="mb-4 text-xl font-semibold">{marca ? 'Marca' : 'Categoria'} do produto</h1>
      {marca ? <MarcasSelector value={values} onChange={setValues} /> : <CategoriasSelector value={values} onChange={setValues} />}
      <output aria-label="Produto salvo">{submits}</output>
    </form></main><Toaster />
  </QueryClientProvider></AuthContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
