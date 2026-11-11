import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { ReceitaRendimento } from '@/lib/producaoRendimento';
export interface FuncionarioOpt { id:string;nome:string;cargo:string|null }
export function useProducaoOpcoes() {
 const {user}=useAuth();
  return useQuery({
    queryKey: ['producao-editor-opcoes', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const funcionarios: FuncionarioOpt[] = [];
      const receitas: ReceitaRendimento[] = [];
      // Paginate so large recipe books remain searchable in full.
      await Promise.all([
        (async () => {
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from('folha_pagamento').select('id, nome, cargo')
              .eq('user_id', user!.id).eq('ativo', true).order('nome').order('id').range(offset, offset + 499);
            if (error) throw error;
            funcionarios.push(...(data ?? []));
            if (!data || data.length < 500) break;
          }
        })(),
        (async () => {
          for (let offset = 0; ; offset += 500) {
            const { data, error } = await supabase.from('receitas').select('id, nome, imagem_url, rendimento_valor, rendimento_unidade')
              .eq('user_id', user!.id).order('nome').order('id').range(offset, offset + 499);
            if (error) throw error;
            receitas.push(...(data ?? []));
            if (!data || data.length < 500) break;
          }
        })(),
      ]);
      return { funcionarios, receitas };
    },
  });
}
