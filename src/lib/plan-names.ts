// Public names are independent of the stable IDs used by billing and existing accounts.
export const PLAN_NAMES = {
  lite: 'Iniciante',
  professional: 'Profissional',
  enterprise: 'Empresarial',
} as const;

export function planDisplayName(plan?: string | null): string {
  const slug = plan === 'free' ? 'lite' : plan;
  if (slug && Object.prototype.hasOwnProperty.call(PLAN_NAMES, slug)) {
    return PLAN_NAMES[slug as keyof typeof PLAN_NAMES];
  }
  return plan || '—';
}
