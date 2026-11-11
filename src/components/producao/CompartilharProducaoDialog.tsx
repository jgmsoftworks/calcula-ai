import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Copy, Download, Link2 as Link2Icon, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
export function CompartilharProducaoDialog({dataStr,open,onOpenChange}:{dataStr:string;open:boolean;onOpenChange:(open:boolean)=>void}) {
  const {user}=useAuth();
  const [shareUrl, setShareUrl] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [shareQrCode, setShareQrCode] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const shareStorageKey = user?.id && dataStr ? `producao-share:${user.id}:${dataStr}` : '';

  useEffect(() => {
    if (!shareStorageKey) return;
    const restoreShareLink = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem(shareStorageKey) ?? 'null') as { url?: string; expiresAt?: string } | null;
        if (!saved?.url || !saved.expiresAt || new Date(saved.expiresAt) <= new Date()) {
          localStorage.removeItem(shareStorageKey);
          return;
        }
        const { data, error } = await supabase.functions.invoke('producao-compartilhada', {
          body: { action: 'status', date: dataStr },
        });
        if (!error && data?.active) {
          setShareUrl(saved.url);
          setShareExpiresAt(saved.expiresAt);
        } else {
          localStorage.removeItem(shareStorageKey);
        }
      } catch {
        localStorage.removeItem(shareStorageKey);
      }
    };
    void restoreShareLink();
  }, [shareStorageKey, dataStr]);

  useEffect(() => {
    if (!shareUrl) {
      setShareQrCode('');
      return;
    }
    QRCode.toDataURL(shareUrl, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
      .then(setShareQrCode)
      .catch(() => setShareQrCode(''));
  }, [shareUrl]);

  const generateShareLink = async () => {
    setShareLoading(true);
    const { data, error } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'create', date: dataStr },
    });
    if (error || data?.error) {
      toast({ title: 'Erro ao gerar link', description: data?.error ?? error?.message, variant: 'destructive' });
    } else {
      const url = `${window.location.origin}/producao-compartilhada/${data.token}`;
      setShareUrl(url);
      setShareExpiresAt(data.expiresAt);
      if (shareStorageKey) localStorage.setItem(shareStorageKey, JSON.stringify({ url, expiresAt: data.expiresAt }));
      toast({ title: 'Link gerado por 24 horas' });
    }
    setShareLoading(false);
  };

  const revokeShareLink = async () => {
    setShareLoading(true);
    const { data, error } = await supabase.functions.invoke('producao-compartilhada', {
      body: { action: 'revoke', date: dataStr },
    });
    if (error || data?.error) toast({ title: 'Erro ao revogar link', description: data?.error ?? error?.message, variant: 'destructive' });
    else {
      setShareUrl('');
      setShareExpiresAt('');
      if (shareStorageKey) localStorage.removeItem(shareStorageKey);
      toast({ title: 'Link revogado' });
    }
    setShareLoading(false);
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copiado' });
  };

  const downloadQrCode = () => {
    if (!shareQrCode) return;
    const anchor = document.createElement('a');
    anchor.href = shareQrCode;
    anchor.download = `producao-${dataStr}-qrcode.png`;
    anchor.click();
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compartilhar produção do dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
              Quem receber o link poderá visualizar as tarefas, filtrar por responsável e apenas avançar de <strong>A fazer</strong> para <strong>Em produção</strong> e depois para <strong>Feito</strong>. O link expira em 24 horas.
            </div>
            {shareUrl ? (
              <>
                <div className="space-y-2">
                  <Label>Link temporário</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="text-xs" />
                    <Button size="icon" variant="outline" onClick={copyShareLink} aria-label="Copiar link"><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Válido até {format(new Date(shareExpiresAt), 'dd/MM/yyyy HH:mm')}.</p>
                </div>
                {shareQrCode && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-4">
                    <img src={shareQrCode} alt="QR Code do link temporário" className="h-52 w-52" />
                    <Button variant="outline" size="sm" onClick={downloadQrCode}>
                      <Download className="mr-2 h-4 w-4" /> Baixar QR Code
                    </Button>
                  </div>
                )}
                <Button variant="destructive" className="w-full" onClick={revokeShareLink} disabled={shareLoading}>
                  {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revogar link agora'}
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={generateShareLink} disabled={shareLoading}>
                {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Link2Icon className="mr-2 h-4 w-4" />Gerar link válido por 24 horas</>}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>;
}
