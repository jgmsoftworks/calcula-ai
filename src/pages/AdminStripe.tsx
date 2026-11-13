import { useCallback } from 'react';
import { planDisplayName } from '@/lib/plan-names';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatBRL } from '@/lib/formatters';
import { Activity, CreditCard, Link as LinkIcon, Settings, FileText, RefreshCw, Ban, RotateCcw, AlertTriangle } from 'lucide-react';

import { AdminFinancialPanel } from '@/components/admin/AdminFinancialPanel';
import type { StripeDashboardData } from '@/lib/adminFinancial';

interface SubRow {
  id: string;
  status: string;
  customer_email: string | null;
  customer_name: string | null;
  amount: number;
  interval: string | null;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export default function AdminStripe() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.rpc('has_role_or_higher', { required_role: 'admin', check_user_id: user.id });
      setIsAdmin(!!data);
    })();
  }, [user]);

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
          <CardContent>Apenas administradores podem acessar o painel Stripe.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Stripe</h1>
        <p className="text-muted-foreground">Gerencie assinaturas, links e configurações sem sair do sistema.</p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="dashboard"><Activity className="w-4 h-4 mr-2"/>Dashboard</TabsTrigger>
          <TabsTrigger value="subs"><CreditCard className="w-4 h-4 mr-2"/>Assinaturas</TabsTrigger>
          <TabsTrigger value="links"><LinkIcon className="w-4 h-4 mr-2"/>Payment Links</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2"/>Configurações</TabsTrigger>
          <TabsTrigger value="nf"><FileText className="w-4 h-4 mr-2"/>Nota Fiscal</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="subs"><SubscriptionsTab /></TabsContent>
        <TabsContent value="links"><PaymentLinksTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="nf"><NfSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- DASHBOARD ----------------
function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StripeDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabase.functions.invoke('stripe-admin-dashboard');
      if (result.error || !result.data?.current) throw new Error('report_unavailable');
      setData(result.data); setError(null);
    } catch {
      setData(null); setError('Consulta financeira indisponível. Tente atualizar.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading && !data) return <LoadingSpinner />;
  return <div className="space-y-4">
    <div className="flex justify-end"><Button variant="outline" size="sm" onClick={load} disabled={loading}>
      <RefreshCw className="w-4 h-4 mr-2" />Atualizar
    </Button></div>
    <AdminFinancialPanel data={data} error={error} showTransactions />
  </div>;
}

// ---------------- SUBSCRIPTIONS ----------------
function SubscriptionsTab() {
  const [source, setSource] = useState<'current' | 'legacy'>('current');
  const [status, setStatus] = useState('active');
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('stripe-admin-subscriptions', {
      body: { action: 'list', source, status, limit: 100 },
    });
    setLoading(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setSubs(data?.subscriptions ?? []);
  }, [source, status, toast]);

  useEffect(() => { load(); }, [load, source, status]);

  const cancel = async (id: string, immediate: boolean) => {
    if (!confirm(immediate ? 'Cancelar imediatamente?' : 'Cancelar ao fim do ciclo?')) return;
    const { error } = await supabase.functions.invoke('stripe-admin-subscriptions', {
      body: { action: 'cancel', source, subscription_id: id, immediate },
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Cancelamento agendado' }); load();
  };

  const reactivate = async (id: string) => {
    const { error } = await supabase.functions.invoke('stripe-admin-subscriptions', {
      body: { action: 'reactivate', source, subscription_id: id },
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Reativada' }); load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label>Conta</Label>
            <Select value={source} onValueChange={(v) => { if (v === 'current' || v === 'legacy') setSource(v); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Atual</SelectItem>
                <SelectItem value="legacy">Legada (CPF)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="past_due">Inadimplentes</SelectItem>
                <SelectItem value="canceled">Canceladas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}/>Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Cliente</TableHead><TableHead>Status</TableHead>
            <TableHead>Valor</TableHead><TableHead>Próximo ciclo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {subs.map(s => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.customer_name ?? s.customer_email ?? s.id}</div>
                  <div className="text-xs text-muted-foreground">{s.customer_email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                  {s.cancel_at_period_end && <Badge variant="outline" className="ml-1">cancela no fim</Badge>}
                </TableCell>
                <TableCell>{formatBRL(s.amount)}/{s.interval === 'month' ? 'mês' : s.interval === 'year' ? 'ano' : s.interval}</TableCell>
                <TableCell className="text-sm">{s.current_period_end ? new Date(s.current_period_end * 1000).toLocaleDateString('pt-BR') : '—'}</TableCell>
                <TableCell className="text-right space-x-1">
                  {s.cancel_at_period_end ? (
                    <Button size="sm" variant="outline" onClick={() => reactivate(s.id)}><RotateCcw className="w-3 h-3 mr-1"/>Reativar</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => cancel(s.id, false)}>Fim do ciclo</Button>
                      <Button size="sm" variant="destructive" onClick={() => cancel(s.id, true)}><Ban className="w-3 h-3 mr-1"/>Agora</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {subs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma assinatura</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------------- PAYMENT LINKS ----------------
interface PaymentLink { id: string; plan_type: string; billing: string; url: string; price_id: string | null; active: boolean; notes: string | null; }

function PaymentLinksTab() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('payment_links').select('*').order('plan_type').order('billing');
    setLoading(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setLinks(data ?? []);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: Partial<PaymentLink>) => {
    const { error } = await supabase.from('payment_links').update(patch).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Link atualizado' });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Links</CardTitle>
        <CardDescription>
          Links de divulgação (buy.stripe.com) dos planos mensais Iniciante, Profissional e Empresarial na conta PJ.
          Os assinantes antigos continuam no preço legado da conta CPF — só novos cadastros usam estes links.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <LoadingSpinner />}
        {links.map(link => (
          <div key={link.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Badge>{planDisplayName(link.plan_type)}</Badge>{' '}
                <Badge variant="outline">{link.billing}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={link.active} onCheckedChange={(v) => update(link.id, { active: v })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">URL do Payment Link</Label>
              <Input
                defaultValue={link.url}
                onBlur={(e) => e.target.value !== link.url && update(link.id, { url: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
            </div>
            <div>
              <Label className="text-xs">Price ID (opcional)</Label>
              <Input
                defaultValue={link.price_id ?? ''}
                onBlur={(e) => e.target.value !== (link.price_id ?? '') && update(link.id, { price_id: e.target.value || null })}
                placeholder="price_..."
              />
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input
                defaultValue={link.notes ?? ''}
                onBlur={(e) => e.target.value !== (link.notes ?? '') && update(link.id, { notes: e.target.value || null })}
                placeholder="Ex: Conta PJ CalculaAi LTDA"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------- SETTINGS ----------------
function SettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chaves Stripe</CardTitle>
          <CardDescription>
            As chaves secretas vivem nos secrets do Supabase (não no banco). Aqui você só ativa o modo legado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <p className="font-medium text-sm">Como trocar de CPF para PJ:</p>
            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
              <li>Antes de trocar, copie sua chave atual (CPF) e cole no secret <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY_LEGACY</code></li>
              <li>Ative "Modo Legado" abaixo (vai mostrar abas separadas)</li>
              <li>Atualize o secret <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> com a nova chave da PJ</li>
              <li>Vá na aba "Payment Links" e cole as 4 novas URLs da PJ</li>
              <li>Pronto — assinantes antigos continuam na CPF, novos cadastros vão pra PJ</li>
            </ol>
          </div>
          <SettingRow settingKey="legacy_enabled" label="Modo Legado ativado" type="boolean"
            description="Quando ativo, painel também consulta a conta antiga (CPF) usando STRIPE_SECRET_KEY_LEGACY"/>
          <SettingRow settingKey="current_account_label" label="Rótulo da conta atual" type="text" placeholder="Ex: PJ CalculaAi LTDA"/>
          <SettingRow settingKey="legacy_account_label" label="Rótulo da conta legada" type="text" placeholder="Ex: CPF Jean (legado)"/>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({ settingKey, label, type, placeholder, description, table = 'stripe_settings' }:
  { settingKey: string; label: string; type: 'text' | 'boolean' | 'textarea'; placeholder?: string; description?: string; table?: 'stripe_settings' | 'nf_settings' }) {
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from(table).select('value').eq('key', settingKey).maybeSingle();
      setValue(data?.value ?? '');
      setLoading(false);
    })();
  }, [settingKey, table]);

  const save = async (newValue: string) => {
    const { error } = await supabase.from(table).upsert({ key: settingKey, value: newValue }, { onConflict: 'key' });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: 'Salvo' });
  };

  if (loading) return null;

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {type === 'boolean' ? (
        <Switch checked={value === 'true'} onCheckedChange={(v) => { setValue(v ? 'true' : 'false'); save(v ? 'true' : 'false'); }} />
      ) : type === 'textarea' ? (
        <Textarea defaultValue={value} placeholder={placeholder} onBlur={(e) => e.target.value !== value && (setValue(e.target.value), save(e.target.value))} />
      ) : (
        <Input defaultValue={value} placeholder={placeholder} onBlur={(e) => e.target.value !== value && (setValue(e.target.value), save(e.target.value))} />
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

// ---------------- NF SETTINGS ----------------
function NfSettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nota Fiscal Eletrônica (NFS-e)</CardTitle>
          <CardDescription>
            Estrutura pronta — falta escolher o provider e configurar. Sugestões: <strong>NFE.io</strong>, <strong>Focus NFe</strong>, <strong>eNotas</strong>, <strong>PlugNotas</strong>.
            As chaves de API ficam nos secrets do Supabase: <code className="bg-muted px-1 rounded">NF_API_KEY</code> e <code className="bg-muted px-1 rounded">NF_COMPANY_ID</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingRow table="nf_settings" settingKey="enabled" label="Emissão automática ativada" type="boolean"
            description="Quando uma assinatura é paga, emite NFS-e automaticamente"/>
          <SettingRow table="nf_settings" settingKey="provider" label="Provider" type="text" placeholder="nfe_io | focus | enotas | plugnotas"/>
          <SettingRow table="nf_settings" settingKey="environment" label="Ambiente" type="text" placeholder="sandbox | production"/>
          <SettingRow table="nf_settings" settingKey="company_cnpj" label="CNPJ da empresa" type="text" placeholder="00.000.000/0000-00"/>
          <SettingRow table="nf_settings" settingKey="company_municipal_registration" label="Inscrição municipal" type="text"/>
          <SettingRow table="nf_settings" settingKey="service_code" label="Código de serviço municipal" type="text" placeholder="Ex: 01.05"/>
          <SettingRow table="nf_settings" settingKey="service_description" label="Descrição padrão do serviço" type="textarea"/>
          <SettingRow table="nf_settings" settingKey="iss_rate" label="Alíquota ISS (%)" type="text" placeholder="0"/>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Próximo passo</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Quando você escolher o provider (NFE.io, Focus, eNotas ou PlugNotas):</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Me avise qual escolheu</li>
            <li>Adicione os secrets <code className="bg-muted px-1 rounded">NF_API_KEY</code> e <code className="bg-muted px-1 rounded">NF_COMPANY_ID</code></li>
            <li>Eu ativo a integração específica (~30min) — emissão automática via webhook do Stripe</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
