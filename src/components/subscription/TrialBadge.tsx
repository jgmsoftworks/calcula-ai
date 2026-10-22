import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export function TrialBadge() {
  const { isTrial, daysRemaining, trialExpired, loading, error } = useSubscriptionStatus();
  if (loading || error || !isTrial) return null;
  const label = trialExpired ? 'Teste encerrado' : `${daysRemaining} ${daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`;
  return (
    <Link to="/planos" aria-label={`${label} no teste Iniciante. Ver planos`}
      className="trial-glow inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0483e4] to-[#7328b1] px-3 py-2 text-xs font-semibold text-white transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <Sparkles className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
      <span><span className="hidden lg:inline">Teste Iniciante · </span>{label}</span>
    </Link>
  );
}
