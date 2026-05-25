import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageCircle, Phone, Mail, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface IssueRow {
  id: string;
  user_id: string | null;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  issue_type: 'payment_failed' | 'subscription_canceled' | 'past_due';
  status: 'pending' | 'contacted' | 'resolved' | 'ignored';
  amount_due: number | null;
  currency: string | null;
  attempt_count: number | null;
  next_retry_at: string | null;
  grace_period_ends_at: string | null;
  failure_reason: string | null;
  admin_notes: string | null;
  contacted_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  celular: string | null;
  whatsapp: string | null;
  telefone_comercial: string | null;
  plan: string | null;
}

const getPhone = (p?: ProfileInfo | null) =>
  p?.whatsapp || p?.celular || p?.phone || p?.telefone_comercial || null;

const onlyDigits = (s: string) => s.replace(/\D/g, '');

const ISSUE_LABEL: Record<IssueRow['issue_type'], { label: string; color: string }> = {
  payment_failed: { label: 'Falha de pagamento', color: 'bg-red-500/15 text-red-700 border-red-500/30' },
  past_due: { label: 'Em atraso', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  subscription_canceled: { label: 'Cancelada', color: 'bg-slate-500/15 text-slate-700 border-slate-500/30' },
};

const STATUS_LABEL: Record<IssueRow['status'], { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-red-500/15 text-red-700 border-red-500/30' },
  contacted: { label: 'Contatado', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  resolved: { label: 'Resolvido', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  ignored: { label: 'Ignorado', color: 'bg-slate-500/15 text-slate-700 border-slate-500/30' },
};

export default function AdminInadimplencia() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<IssueRow | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<IssueRow['status']>('contacted');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: issuesData, error } = await supabase
        .from('subscription_issues')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const list = (issuesData as IssueRow[]) || [];
      setIssues(list);

      const userIds = Array.from(new Set(list.map((i) => i.user_id).filter(Boolean))) as string[];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name, business_name, phone, celular, whatsapp, telefone_comercial, plan')
          .in('user_id', userIds);
        const map: Record<string, ProfileInfo> = {};
        (profs as ProfileInfo[] | null)?.forEach((p) => {
          map[p.user_id] = p;
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao carregar',
        description: e?.message || 'Falha ao buscar inadimplência.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (typeFilter !== 'all' && i.issue_type !== typeFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        const p = i.user_id ? profiles[i.user_id] : null;
        const hay = `${i.email} ${p?.full_name || ''} ${p?.business_name || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [issues, statusFilter, typeFilter, search, profiles]);

  const counts = useMemo(
    () => ({
      pending: issues.filter((i) => i.status === 'pending').length,
      contacted: issues.filter((i) => i.status === 'contacted').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
    }),
    [issues]
  );

  const openEdit = (i: IssueRow) => {
    setEditing(i);
    setNotesDraft(i.admin_notes || '');
    setStatusDraft(i.status === 'pending' ? 'contacted' : i.status);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const patch: any = {
        status: statusDraft,
        admin_notes: notesDraft || null,
        updated_at: new Date().toISOString(),
      };
      if (statusDraft === 'contacted' && editing.status === 'pending') {
        patch.contacted_at = new Date().toISOString();
      }
      if (statusDraft === 'resolved') {
        patch.resolved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('subscription_issues')
        .update(patch)
        .eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Atualizado', description: 'Status do cliente salvo.' });
      setEditing(null);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const whatsappLink = (phone: string | null, name: string | null, issue: IssueRow) => {
    if (!phone) return null;
    const tipo =
      issue.issue_type === 'payment_failed' ? 'falha no pagamento'
      : issue.issue_type === 'subscription_canceled' ? 'cancelamento da assinatura'
      : 'pagamento em atraso';
    const msg = encodeURIComponent(
      `Olá${name ? `, ${name.split(' ')[0]}` : ''}! Aqui é do CalculaAi. Identificamos um problema na sua assinatura (${tipo}) e estamos à disposição para te ajudar a regularizar. Seus dados continuam salvos. Posso te ajudar agora?`
    );
    return `https://wa.me/55${onlyDigits(phone)}?text=${msg}`;
  };

  if (authLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Inadimplência</h1>
          <p className="text-sm text-muted-foreground">Clientes com falha ou cancelamento de pagamento — contato manual</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes (precisam contato)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.contacted}</p>
              <p className="text-xs text-muted-foreground">Em acompanhamento</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Buscar por email/nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="contacted">Contatados</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="ignored">Ignorados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="payment_failed">Falha de pagamento</SelectItem>
              <SelectItem value="past_due">Em atraso</SelectItem>
              <SelectItem value="subscription_canceled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Clientes ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
              Nenhum cliente com esse filtro. Tudo em dia!
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((i) => {
                const profile = i.user_id ? profiles[i.user_id] : null;
                const phone = getPhone(profile);
                const wa = whatsappLink(phone, profile?.full_name || null, i);
                const name = profile?.full_name || profile?.business_name || i.email.split('@')[0];

                return (
                  <div key={i.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{name}</p>
                          <Badge variant="outline" className={ISSUE_LABEL[i.issue_type].color}>
                            {ISSUE_LABEL[i.issue_type].label}
                          </Badge>
                          <Badge variant="outline" className={STATUS_LABEL[i.status].color}>
                            {STATUS_LABEL[i.status].label}
                          </Badge>
                          {profile?.plan && (
                            <Badge variant="outline" className="text-xs">Plano: {profile.plan}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{i.email}</span>
                          {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</span>}
                          <span>{new Date(i.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        {i.amount_due ? (
                          <p className="text-xs text-muted-foreground">
                            <CreditCard className="w-3 h-3 inline mr-1" />
                            Devido: <strong>{formatBRL(Number(i.amount_due))}</strong>
                            {i.attempt_count ? ` • Tentativa #${i.attempt_count}` : ''}
                            {i.next_retry_at && ` • Próxima cobrança: ${new Date(i.next_retry_at).toLocaleDateString('pt-BR')}`}
                          </p>
                        ) : null}
                        {i.failure_reason && (
                          <p className="text-xs text-foreground/80 bg-muted/50 rounded px-2 py-1 mt-1">
                            <strong>Motivo:</strong> {i.failure_reason}
                          </p>
                        )}
                        {i.admin_notes && (
                          <p className="text-xs text-foreground/80 mt-1">
                            <strong>Notas:</strong> {i.admin_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {wa ? (
                          <Button size="sm" variant="default" asChild>
                            <a href={wa} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>Sem telefone</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(i)}>
                          Atualizar status
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status do contato</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{editing.email}</div>
              <Select value={statusDraft} onValueChange={(v) => setStatusDraft(v as IssueRow['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="ignored">Ignorado</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Notas internas (ex: cliente disse que vai pagar amanhã, cartão expirado, etc.)"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
