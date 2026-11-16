import { useEffect, useState, type FormEvent } from 'react';
import { Plug, RefreshCw, Link2Off, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Connection {
  id: string;
  provider: 'anota_ai';
  external_store_id: string;
  active: boolean;
  connected_at: string;
  last_checked_at: string | null;
  last_error: string | null;
}
type RequestBody =
  | { action: 'status' }
  | { action: 'connect'; pageId: string; pageToken: string }
  | { action: 'test' | 'disconnect'; connectionId: string };

async function invoke(body: RequestBody): Promise<{ ok: boolean; error?: string; connections?: Connection[] }> {
  const { data, error } = await supabase.functions.invoke('anota-ai', { body });
  if (error) {
    let message = 'Não foi possível acessar a integração.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      const payload: unknown = await context.clone().json().catch(() => null);
      if (payload && typeof payload === 'object' && 'error' in payload &&
          typeof payload.error === 'string') message = payload.error;
    }
    throw new Error(message);
  }
  if (!data?.ok) throw new Error(data?.error ?? 'A operação não foi concluída.');
  return data;
}

export default function Integracoes() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pageId, setPageId] = useState('');
  const [pageToken, setPageToken] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setConnections([]);
    void invoke({ action: 'status' })
      .then(result => { if (active) setConnections(result.connections ?? []); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar conexões.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const refresh = async () => {
    const result = await invoke({ action: 'status' });
    setConnections(result.connections ?? []);
  };

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (!/^[0-9a-f]{24}$/i.test(pageId.trim())) {
      setError('O ID da loja precisa ter 24 caracteres hexadecimais.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await invoke({ action: 'connect', pageId: pageId.trim(), pageToken });
      setPageId('');
      setPageToken('');
      await refresh();
      toast.success('Loja conectada à Calcula Aí.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao conectar.');
    } finally {
      setBusy(false);
    }
  };

  const perform = async (action: 'test' | 'disconnect', connectionId: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await invoke({ action, connectionId });
      await refresh();
      toast.success(action === 'test' ? 'Acesso à loja validado.' : 'Conexão desativada na Calcula Aí.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha na operação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
        <p className="text-muted-foreground">Conecte seus canais de venda à Calcula Aí com segurança.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5" /> Anota AI</CardTitle>
          <CardDescription>
            Etapa 1: vínculo e verificação da loja. Importação de pedidos, análise de margem e
            movimentação automática de estoque ainda não estão ativadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            A chave da sua loja é usada apenas no servidor durante a vinculação.
            Ela não é armazenada no cadastro da Calcula Aí.
          </div>
          <form onSubmit={connect} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anota-store-id">ID da loja</Label>
              <Input id="anota-store-id" value={pageId} maxLength={24}
                onChange={event => setPageId(event.target.value)} placeholder="24 caracteres" required
                autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anota-store-token">Chave de integração da loja</Label>
              <Input id="anota-store-token" type="password" value={pageToken}
                onChange={event => setPageToken(event.target.value)} required autoComplete="off" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Button type="submit" disabled={loading || busy || !pageId || !pageToken}>
                {busy ? 'Conectando…' : 'Conectar loja'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Os dados ficam no painel da Anota AI, em Configurações → Integrações. Para vincular
                outra loja, informe seu próprio ID e chave.
              </p>
            </div>
          </form>

          {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          {loading ? <p className="text-sm text-muted-foreground">Carregando conexões…</p> :
            connections.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold">Lojas cadastradas</h2>
                {connections.map(connection => (
                  <div key={connection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="font-medium">Anota AI · {connection.external_store_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {connection.active ? 'Conectada' : 'Desconectada'}
                        {connection.last_checked_at &&
                          ' · Verificada em ' + new Date(connection.last_checked_at).toLocaleString('pt-BR')}
                      </p>
                      {connection.last_error && <p className="text-sm text-destructive">{connection.last_error}</p>}
                    </div>
                    {connection.active && (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={busy}
                          onClick={() => void perform('test', connection.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Testar
                        </Button>
                        <Button type="button" variant="outline" size="sm" disabled={busy}
                          onClick={() => void perform('disconnect', connection.id)}>
                          <Link2Off className="mr-2 h-4 w-4" /> Desconectar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
