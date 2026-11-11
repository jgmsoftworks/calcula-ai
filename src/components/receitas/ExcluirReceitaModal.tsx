import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Loader2, Refrigerator, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { localizeText } from '@/i18n/localizeText';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { carregarUsosReceita, excluirReceitaComVinculos, usoReceitaKey, type ExclusaoReceita } from '@/lib/receitaDelete';

type Props = { receitaId: string; nome: string; onClose: () => void; onDeleted: () => void };

export function ExcluirReceitaModal({ receitaId, nome, onClose, onDeleted }: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contexto, setContexto] = useState<ExclusaoReceita | null>(null);
  const [removidos, setRemovidos] = useState(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const [reload, setReload] = useState(0);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setContexto(null); setRemovidos(new Set()); setError(''); setStale(false);
    carregarUsosReceita(receitaId, controller.signal).then(data => {
      if (!controller.signal.aborted) setContexto(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('Não foi possível carregar os usos da receita. Tente novamente.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [receitaId, reload, user?.id]);

  const restantes = contexto?.usos.filter(uso => !removidos.has(usoReceitaKey(uso))).length ?? 0;
  const close = () => { if (!savingRef.current) onClose(); };
  const toggle = (key: string) => setRemovidos(previous => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const confirm = async () => {
    if (!contexto || loading || stale || restantes || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError('');
    try {
      await excluirReceitaComVinculos(contexto, removidos);
      for (const key of ['receitas-lista', 'receita-editor', 'geladeira', 'geladeira-receitas', 'geladeira-receita-detalhes', 'geladeira-historico']) {
        void queryClient.invalidateQueries({ queryKey: [key, user?.id] });
      }
      toast.success(localizeText('Receita excluída com sucesso!'));
      onDeleted(); onClose();
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      if (code === 'P0002') {
        toast.info(localizeText('Esta receita não está mais disponível.'));
        onDeleted(); onClose();
      } else if (code === '40001' || code === '23503') {
        setStale(true);
        setError('A receita ou seus usos mudaram. Atualize a lista e confira novamente. Nenhuma remoção foi aplicada.');
      } else {
        setError('Não foi possível confirmar a exclusão. Tente novamente.');
      }
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:p-0"
      onEscapeKeyDown={event => { if (savingRef.current) event.preventDefault(); }}
      onPointerDownOutside={event => { if (savingRef.current) event.preventDefault(); }}>
      <DialogHeader className="px-5 pb-4 pt-6 text-left sm:px-6">
        <DialogTitle className="pr-9 leading-snug">{localizeText('Excluir receita')}</DialogTitle>
        <DialogDescription className="break-words">{contexto?.receita.nome || nome}</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
        {loading && <p role="status" className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{localizeText('Conferindo onde a receita é usada…')}</p>}
        {contexto && <>
          <p className="text-sm text-muted-foreground">{localizeText(contexto.usos.length
            ? 'Esta receita está em uso nos locais abaixo. Marque cada vínculo na lixeira para liberar a exclusão. As outras receitas serão mantidas.'
            : 'Esta receita não possui vínculos que impeçam a exclusão. Esta ação não pode ser desfeita.')}</p>
          {contexto.usos.length > 0 && <>
            <ul className="divide-y rounded-xl border bg-card">
              {contexto.usos.map(uso => {
                const key = usoReceitaKey(uso), removed = removidos.has(key);
                const Icon = uso.tipo === 'geladeira' ? Refrigerator : ChefHat;
                return <li key={key} className="flex items-center gap-3 p-3">
                  {uso.imagem_url ? <img src={uso.imagem_url} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>}
                  <div className="min-w-0 flex-1">
                    <p className={`break-words text-sm font-medium leading-snug ${removed ? 'text-muted-foreground line-through' : ''}`}>{uso.nome}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{uso.tipo === 'receita'
                      ? `#${uso.numero_sequencial} · ${localizeText('Usa como sub-receita')}`
                      : `${localizeText('Saldo')}: ${new Intl.NumberFormat(i18n.language || 'pt-BR', { maximumFractionDigits: 3 }).format(uso.estoque_atual || 0)} ${uso.unidade}`}</p>
                    {removed && <p className="mt-1 text-xs text-destructive">{localizeText('Remoção pendente')}</p>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className={`h-11 w-11 shrink-0 ${removed ? 'text-muted-foreground' : 'text-destructive hover:text-destructive'}`}
                    disabled={saving || stale} onClick={() => toggle(key)} aria-label={`${localizeText(removed ? 'Desfazer remoção de' : 'Remover vínculo com')} ${uso.nome}`}>
                    {removed ? <Undo2 aria-hidden="true" className="h-4 w-4" /> : <Trash2 aria-hidden="true" className="h-4 w-4" />}
                  </Button>
                </li>;
              })}
            </ul>
            <p className="text-sm text-muted-foreground">{localizeText('Ao confirmar, os vínculos serão removidos e esta receita será excluída definitivamente. Se cancelar, nada será alterado.')}</p>
            {contexto.usos.some(uso => uso.tipo === 'geladeira') && <p className="text-sm text-muted-foreground">{localizeText('O item e seu saldo sairão da Geladeira. O histórico de movimentações será preservado.')}</p>}
            <p role="status" className="text-sm font-medium">{restantes
              ? `${restantes} ${localizeText(restantes === 1 ? 'vínculo pendente' : 'vínculos pendentes')}`
              : localizeText('Tudo pronto para confirmar a exclusão.')}</p>
          </>}
        </>}
        {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{localizeText(error)}</p>
          {(!contexto || stale) && <Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>{localizeText(stale ? 'Atualizar lista' : 'Tentar novamente')}</Button>}
        </div>}
      </div>
      <DialogFooter className="gap-2 border-t px-5 py-4 sm:px-6">
        <Button type="button" variant="outline" onClick={close} disabled={saving}>{localizeText('Cancelar')}</Button>
        <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={loading || !contexto || restantes > 0 || stale || saving}>
          {saving && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}{localizeText(saving ? 'Excluindo…' : 'Excluir receita')}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
