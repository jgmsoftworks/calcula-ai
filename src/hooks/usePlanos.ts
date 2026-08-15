import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlanSlug = 'lite' | 'professional' | 'enterprise';

export interface PlanoLimites {
  produtos: number;
  receitas: number;
  markups: number;
  movimentacoes: number;
  pdf_exports: number;
}

export interface Plano {
  id: string;
  slug: PlanSlug;
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
  limites: PlanoLimites;
  features: string[];
}

export const formatPreco = (centavos: number) => {
  if (!centavos) return 'Grátis';
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
};

/** Fonte central de planos — sempre vinda do banco (tabela public.planos). */
export const usePlanos = (incluirInativos = false) => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('planos').select('*').order('ordem', { ascending: true });
      if (!incluirInativos) query = query.eq('ativo', true);
      const { data, error } = await query;
      if (error) throw error;
      setPlanos(
        (data || []).map((p: any) => ({
          ...p,
          limites: (p.limites || {}) as PlanoLimites,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        })) as Plano[],
      );
      setError(null);
    } catch (err: any) {
      console.error('Erro ao carregar planos:', err);
      setError(err?.message ?? 'Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, [incluirInativos]);

  useEffect(() => {
    load();
  }, [load]);

  const getPlano = useCallback(
    (slug: string) => planos.find((p) => p.slug === (slug === 'free' ? 'lite' : slug)),
    [planos],
  );

  return { planos, loading, error, reload: load, getPlano };
};
