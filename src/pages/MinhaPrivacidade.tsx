import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, ShieldCheck, AlertTriangle, Loader2, Cookie, FileText } from 'lucide-react';

interface DeletionStatus {
  pending: boolean;
  scheduledFor: string | null;
  reason: string | null;
}

export default function MinhaPrivacidade() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<DeletionStatus>({ pending: false, scheduledFor: null, reason: null });

  useEffect(() => { void loadStatus(); }, [user?.id]);

  async function loadStatus() {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('deletion_requested_at, deletion_scheduled_for, deletion_reason')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.deletion_scheduled_for && new Date(data.deletion_scheduled_for) > new Date()) {
      setStatus({
        pending: true,
        scheduledFor: data.deletion_scheduled_for,
        reason: data.deletion_reason ?? null,
      });
    } else {
      setStatus({ pending: false, scheduledFor: null, reason: null });
    }
  }

  async function handleExport() {
    if (!user) return;
    setLoadingExport(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Sessão expirada');
      const url = `https://pohtomqnjpnuvuccorov.supabase.co/functions/v1/export-my-data`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Falha ao exportar (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `calcula-ai-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast({ title: 'Download iniciado', description: 'Seus dados foram exportados em JSON.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingExport(false);
    }
  }

  async function handleRequestDelete() {
    if (!user) return;
    setLoadingDelete(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-account-deletion', {
        body: { confirm: true, reason: reason.trim() || null },
      });
      if (error) throw error;
      toast({
        title: 'Exclusão agendada',
        description: `Sua conta será apagada em 30 dias. Você pode cancelar a qualquer momento até lá.`,
      });
      setConfirmText('');
      setReason('');
      await loadStatus();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingDelete(false);
    }
  }

  async function handleCancel() {
    setLoadingCancel(true);
    try {
      const { error } = await supabase.functions.invoke('request-account-deletion', {
        body: { action: 'cancel' },
      });
      if (error) throw error;
      toast({ title: 'Exclusão cancelada', description: 'Sua conta foi mantida.' });
      await loadStatus();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingCancel(false);
    }
  }

  function openCookies() {
    document.cookie = '__cc_open=1;path=/;max-age=5';
    window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Minha Privacidade
        </h1>
        <p className="text-muted-foreground">
          Exerça seus direitos de titular de dados conforme a LGPD (Lei 13.709/2018).
        </p>
      </header>

      {status.pending && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Exclusão de conta agendada</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Sua conta será permanentemente apagada em{' '}
              <strong>{new Date(status.scheduledFor!).toLocaleDateString('pt-BR')}</strong>.
              Após essa data, todos os seus dados serão removidos de forma irreversível.
            </p>
            <Button onClick={handleCancel} disabled={loadingCancel} variant="outline" size="sm">
              {loadingCancel && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar exclusão
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Exportar meus dados
          </CardTitle>
          <CardDescription>
            Baixe uma cópia completa dos seus dados em formato JSON (LGPD Art. 18, II — direito de acesso e portabilidade).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={loadingExport}>
            {loadingExport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Baixar meus dados (JSON)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5" /> Preferências de cookies
          </CardTitle>
          <CardDescription>
            Reveja ou altere seu consentimento para cookies de análise e marketing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={openCookies}>
            <Cookie className="mr-2 h-4 w-4" /> Gerenciar cookies
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Documentos legais
          </CardTitle>
          <CardDescription>Consulte nossas políticas vigentes.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/politica-de-privacidade')}>
            Política de Privacidade
          </Button>
          <Button variant="outline" onClick={() => navigate('/termos-de-uso')}>
            Termos de Uso
          </Button>
          <Button variant="outline" onClick={() => navigate('/cookies')}>
            Política de Cookies
          </Button>
        </CardContent>
      </Card>

      {!status.pending && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Excluir minha conta
            </CardTitle>
            <CardDescription>
              Sua conta será desativada imediatamente e permanentemente apagada em <strong>30 dias</strong>.
              Durante esse período, você pode cancelar a exclusão fazendo login novamente.
              <br />
              LGPD Art. 18, VI — direito de eliminação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Por que você está saindo? (nos ajuda a melhorar)"
                maxLength={500}
                rows={3}
              />
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Solicitar exclusão da conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão da conta</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Esta ação agendará a exclusão permanente de <strong>todos os seus dados</strong>{' '}
                      (receitas, produtos, movimentações, histórico) em <strong>30 dias</strong>.
                    </span>
                    <span className="block">
                      Para confirmar, digite <strong>EXCLUIR</strong> abaixo:
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Digite EXCLUIR"
                  autoComplete="off"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText('')}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText !== 'EXCLUIR' || loadingDelete}
                    onClick={handleRequestDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loadingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center pt-4">
        Encarregado de Dados (DPO): privacidade@calculaaibr.com
      </p>
    </div>
  );
}
