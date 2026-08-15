import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { formatPreco } from '@/hooks/usePlanos';
import { Loader2, Pencil, RefreshCw, CreditCard, History, Users, Layers } from 'lucide-react';

interface PlanoAdmin {
  id: string;
  slug: string;
  nome_publico: string;
  descricao: string | null;
  preco_centavos: number;
  moeda: string;
  periodicidade: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  versao_preco: number;
  ativo: boolean;
  ordem: number;
  limites: Record<string, number>;
  features: string[];
}

const callAdmin = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('admin-planos', { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const AdminPlanos = () => {
  const { toast } = useToast();
  const [planos, setPlanos] = useState<PlanoAdmin[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [perfis, setPerfis] = useState<any[]>([]);
  const [stripeSubs, setStripeSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PlanoAdmin | null>(null);
  const [form, setForm] = useState({
    nome_publico: '',
    descricao: '',
    preco: '',
    features: '',
    ativo: true,
    observacao: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h, s] = await Promise.all([
        callAdmin({ action: 'list' }),
        callAdmin({ action: 'historico' }),
        callAdmin({ action: 'subscribers' }),
      ]);
      setPlanos(p.planos || []);
      setHistorico(h.historico || []);
      setPerfis(s.perfis || []);
      setStripeSubs(s.stripeSubs || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message ?? 'Falha ao carregar planos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openEdit = (plano: PlanoAdmin) => {
    setEditing(plano);
    setForm({
      nome_publico: plano.nome_publico,
      descricao: plano.descricao ?? '',
      preco: (plano.preco_centavos / 100).toFixed(2).replace('.', ','),
      features: (plano.features || []).join('\n'),
      ativo: plano.ativo,
      observacao: '',
    });
  };

  const salvar = async () => {
    if (!editing) return;
    const precoNum = Number(form.preco.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(precoNum) || precoNum < 0) {
      toast({ title: 'Preço inválido', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await callAdmin({
        action: 'update_plano',
        slug: editing.slug,
        nome_publico: form.nome_publico,
        descricao: form.descricao,
        preco_centavos: Math.round(precoNum * 100),
        features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        ativo: form.ativo,
        observacao: form.observacao,
      });
      toast({
        title: 'Plano atualizado',
        description: res.novo_price
          ? 'Novo preço criado no Stripe. Assinantes atuais mantêm o preço antigo.'
          : 'Alterações salvas.',
      });
      setEditing(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const contagemPorPlano = (slug: string) => perfis.filter(p => p.plan === slug).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Planos e Assinaturas</h1>
          <p className="text-sm text-muted-foreground">
            Fonte central de planos. Alterar o preço cria um novo Stripe Price — assinantes atuais mantêm o valor contratado.
          </p>
        </div>
        <Button variant="outline" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos"><Layers className="h-4 w-4 mr-2" />Planos</TabsTrigger>
          <TabsTrigger value="assinantes"><Users className="h-4 w-4 mr-2" />Assinantes</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" />Histórico</TabsTrigger>
          <TabsTrigger value="stripe"><CreditCard className="h-4 w-4 mr-2" />Stripe</TabsTrigger>
        </TabsList>

        <TabsContent value="planos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planos.map(plano => (
              <Card key={plano.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plano.nome_publico}</CardTitle>
                    <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{plano.slug}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold">
                    {formatPreco(plano.preco_centavos)}
                    {plano.preco_centavos > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Versão de preço: v{plano.versao_preco}</p>
                    <p className="font-mono break-all">price: {plano.stripe_price_id ?? '—'}</p>
                    <p className="font-mono break-all">product: {plano.stripe_product_id ?? '—'}</p>
                    <p>{contagemPorPlano(plano.slug)} usuários neste plano</p>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => openEdit(plano)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar plano
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assinantes" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Usuários por plano (banco)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Nome</th>
                    <th className="p-2">Negócio</th>
                    <th className="p-2">Plano</th>
                    <th className="p-2">Expira em</th>
                  </tr>
                </thead>
                <tbody>
                  {perfis.slice(0, 200).map(p => (
                    <tr key={p.user_id} className="border-b border-border/40">
                      <td className="p-2">{p.full_name ?? '—'}</td>
                      <td className="p-2">{p.business_name ?? '—'}</td>
                      <td className="p-2"><Badge variant="secondary">{p.plan}</Badge></td>
                      <td className="p-2">{p.plan_expires_at ? new Date(p.plan_expires_at).toLocaleDateString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de preços</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Plano</th>
                    <th className="p-2">Preço</th>
                    <th className="p-2">Versão</th>
                    <th className="p-2">Vigente de</th>
                    <th className="p-2">Até</th>
                    <th className="p-2">Stripe Price</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id} className="border-b border-border/40">
                      <td className="p-2">{h.plano_slug}</td>
                      <td className="p-2">{formatPreco(h.preco_centavos)}</td>
                      <td className="p-2">v{h.versao_preco}</td>
                      <td className="p-2">{new Date(h.vigente_de).toLocaleDateString('pt-BR')}</td>
                      <td className="p-2">{h.vigente_ate ? new Date(h.vigente_ate).toLocaleDateString('pt-BR') : 'vigente'}</td>
                      <td className="p-2 font-mono text-xs break-all">{h.stripe_price_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assinaturas ativas no Stripe</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">E-mail</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Ciclo</th>
                    <th className="p-2">Renova em</th>
                    <th className="p-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {stripeSubs.map(s => (
                    <tr key={s.id} className="border-b border-border/40">
                      <td className="p-2">{s.email ?? '—'}</td>
                      <td className="p-2">R$ {s.amount.toFixed(2).replace('.', ',')}</td>
                      <td className="p-2">{s.interval === 'year' ? 'Anual' : 'Mensal'}</td>
                      <td className="p-2">{new Date(s.current_period_end * 1000).toLocaleDateString('pt-BR')}</td>
                      <td className="p-2 font-mono text-xs break-all">{s.price_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano {editing?.nome_publico}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome público</Label>
              <Input value={form.nome_publico} onChange={e => setForm({ ...form, nome_publico: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Preço mensal (R$)</Label>
              <Input value={form.preco} onChange={e => setForm({ ...form, preco: e.target.value })} placeholder="29,90" />
              <p className="text-xs text-muted-foreground">
                Alterar o preço cria um novo Stripe Price. Assinantes atuais continuam no preço antigo.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Benefícios (um por linha)</Label>
              <Textarea rows={6} value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Plano ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={v => setForm({ ...form, ativo: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação (auditoria)</Label>
              <Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPlanos;
