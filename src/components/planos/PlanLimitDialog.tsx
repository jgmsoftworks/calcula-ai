import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { planDisplayName } from '@/lib/plan-names';
import type { PlanFeature, PlanLimitResult } from '@/lib/plan-access';
import { PlanMascot, type MascotMood } from './PlanMascot';

const featureNames: Record<PlanFeature, string> = {
  receitas: 'receitas', produtos: 'matérias-primas', markups: 'blocos de markup',
  movimentacoes: 'movimentações', pdf_exports: 'fichas técnicas neste mês',
};

export default function PlanLimitDialog({ feature, result, onClose, onReturnFocus }: {
  feature: PlanFeature; result: PlanLimitResult; onClose: () => void; onReturnFocus: () => void;
}) {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [mood, setMood] = useState<MascotMood>('neutral');
  const blockedPdf = feature === 'pdf_exports' && result.maxAllowed === 0;
  const plan = planDisplayName(result.plan || 'lite');
  const reaction = (value: MascotMood) => ({
    onPointerEnter: () => setMood(value), onPointerLeave: () => setMood('neutral'),
    onFocus: () => setMood(value), onBlur: () => setMood('neutral'),
    onPointerDown: () => setMood(value),
  });
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[460px] gap-0 rounded-3xl border-primary/10 p-6 text-center sm:p-8"
        onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}
        onCloseAutoFocus={event => { event.preventDefault(); onReturnFocus(); }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 rounded-t-3xl bg-gradient-to-b from-primary/10 to-transparent" />
        <PlanMascot mood={mood} />
        <span className="mb-3 mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Plano {plan}</span>
        <DialogTitle ref={titleRef} tabIndex={-1} className="text-2xl font-bold leading-tight outline-none">
          {blockedPdf ? 'Sua ficha técnica está no próximo plano' : 'Vamos dar espaço às suas próximas ideias?'}
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-relaxed">
          {blockedPdf
            ? `O plano ${plan}, inclusive durante o teste grátis, não inclui baixar ou imprimir fichas técnicas. Conheça os planos que liberam esse recurso.`
            : `Você atingiu o limite de ${result.maxAllowed !== undefined ? `${result.maxAllowed} ` : ''}${featureNames[feature]} do plano ${plan}. Escolha um plano com mais espaço para continuar criando.`}
        </DialogDescription>
        <p className="mt-3 text-xs text-muted-foreground">Tudo o que você já cadastrou continua salvo.</p>
        <div className="mt-7 grid grid-cols-[0.8fr_1.2fr] gap-2">
          <Button variant="ghost" className="min-h-11 rounded-xl text-muted-foreground" {...reaction('sad')} onClick={onClose}>Agora não</Button>
          <Button className="min-h-11 gap-1.5 rounded-xl bg-gradient-to-r from-[#0483e4] to-[#7328b1] px-2 text-white shadow-md hover:brightness-110" {...reaction('happy')}
            onClick={() => { onClose(); navigate('/planos'); }}>
            Conhecer planos <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
