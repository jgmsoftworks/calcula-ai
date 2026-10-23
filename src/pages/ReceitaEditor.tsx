import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useReceitas } from '@/hooks/useReceitas';
import { NewItemPlanGate } from '@/components/planos/NewItemPlanGate';

export default function ReceitaEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { fetchReceitaCompleta } = useReceitas();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: receita, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['receita-editor', user?.id, id],
    queryFn: async () => {
      const data = await fetchReceitaCompleta(id!);
      if (!data) throw new Error('Receita indisponível');
      return data;
    },
    enabled: Boolean(id && user),
    // Reload when opening the editor, without replacing an in-progress form
    // when the user switches tabs or reconnects to the internet.
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    gcTime: 0,
  });

  const voltarParaReceitas = () => {
    navigate(`/receitas${location.search}`, { replace: true });
  };

  if (id && (isPending || isFetching || isError || !receita)) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={voltarParaReceitas} className="gap-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para receitas
        </Button>
        {isPending || isFetching ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Carregando receita…
          </div>
        ) : (
          <div role="alert" className="rounded-2xl border bg-card p-6 text-center">
            <h1 className="text-lg font-semibold">Não foi possível carregar esta receita</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confira sua conexão. A receita também pode ter sido removida ou não estar disponível para sua conta.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!id) return <NewItemPlanGate feature="receitas" onBack={voltarParaReceitas}>
    <ReceitaForm key="nova" receita={null} onClose={voltarParaReceitas} />
  </NewItemPlanGate>;
  return <ReceitaForm key={id} receita={receita!} onClose={voltarParaReceitas} />;
}
