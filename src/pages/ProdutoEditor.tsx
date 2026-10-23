import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ProdutoForm } from '@/components/estoque/ProdutoForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import type { Produto } from '@/hooks/useEstoque';
import { readNutritionLabels } from '@/lib/nutritionLabel';
import { supabase } from '@/integrations/supabase/client';
import { NewItemPlanGate } from '@/components/planos/NewItemPlanGate';

export default function ProdutoEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: produto, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['produto-editor', user?.id, id],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('produtos').select('*')
        .eq('id', id!).eq('user_id', user!.id).eq('ativo', true)
        .abortSignal(signal).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Produto indisponível');
      readNutritionLabels(data.rotulos_nutricionais, data.rotulo_nutricional);
      return data as Produto;
    },
    enabled: Boolean(id && user),
    // Refresh on entry, without overwriting edits on focus/reconnection.
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    gcTime: 0,
  });

  const voltarParaProdutos = () => navigate(`/estoque${location.search}`, { replace: true });

  if (id && (isPending || isFetching || isError || !produto)) {
    return <div className="space-y-6">
      <Button variant="ghost" className="min-h-11 gap-2" onClick={voltarParaProdutos}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para produtos
      </Button>
      {isPending || isFetching ? <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando produto…
      </div> : <div role="alert" className="rounded-xl border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Não foi possível carregar este produto</h1>
        <p className="mt-2 text-sm text-muted-foreground">Confira sua conexão. O produto também pode ter sido removido ou não estar disponível para sua conta.</p>
        <Button variant="outline" className="mt-4 min-h-11" onClick={() => void refetch()}>Tentar novamente</Button>
      </div>}
    </div>;
  }

  if (!id) return <NewItemPlanGate feature="produtos" onBack={voltarParaProdutos}>
    <ProdutoForm key="novo" onCancel={voltarParaProdutos} onSuccess={voltarParaProdutos} />
  </NewItemPlanGate>;
  return <ProdutoForm key={id} produto={produto} onCancel={voltarParaProdutos} onSuccess={voltarParaProdutos} />;
}
