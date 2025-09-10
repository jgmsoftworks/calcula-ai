import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';
import { useMarkupCalculations } from '@/hooks/useMarkupCalculations';
import { useToast } from '@/hooks/use-toast';
import { MarkupBlock } from './MarkupBlock';
import { SubreceitaBlock } from './SubreceitaBlock';
import { CustosModal } from './CustosModal';

interface MarkupBlockData {
  id: string;
  nome: string;
  lucroDesejado: number;
}

export function Markups() {
  const [blocos, setBlocos] = useState<MarkupBlockData[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<MarkupBlockData | null>(null);
  const [periodos, setPeriodos] = useState<Map<string, string>>(new Map());
  
  const { loadConfiguration, saveConfiguration } = useOptimizedUserConfigurations();
  const { calculations, loading, recalculateAllMarkups } = useMarkupCalculations();
  const { toast } = useToast();

  // Bloco fixo para subreceita com lucro desejado para markup 2,50
  const blocoSubreceita: MarkupBlockData = {
    id: 'subreceita-fixo',
    nome: 'subreceita',
    lucroDesejado: 45 // Valor para atingir markup ideal de 2,50
  };

  // Carregar blocos salvos
  const carregarBlocos = useCallback(async () => {
    try {
      const config = await loadConfiguration('markups_blocos');
      if (config && Array.isArray(config)) {
        const blocosCarregados = config as MarkupBlockData[];
        setBlocos([blocoSubreceita, ...blocosCarregados]);
        
        // Carregar períodos para todos os blocos
        const novosperiodos = new Map<string, string>();
        for (const bloco of [blocoSubreceita, ...blocosCarregados]) {
          const periodo = await loadConfiguration(`filtro-periodo-${bloco.id}`);
          novosperiodos.set(bloco.id, periodo || '12');
        }
        setPeriodos(novosperiodos);
        
        // Recalcular markups
        await recalculateAllMarkups([blocoSubreceita, ...blocosCarregados]);
      } else {
        setBlocos([blocoSubreceita]);
        setPeriodos(new Map([['subreceita-fixo', '12']]));
        await recalculateAllMarkups([blocoSubreceita]);
      }
    } catch (error) {
      console.error('Erro ao carregar blocos:', error);
      setBlocos([blocoSubreceita]);
      setPeriodos(new Map([['subreceita-fixo', '12']]));
    }
  }, [loadConfiguration, recalculateAllMarkups]);

  // Salvar blocos
  const salvarBlocos = useCallback(async (novosBlocos: MarkupBlockData[]) => {
    try {
      // Filtrar o bloco subreceita para não salvar ele
      const blocosParaSalvar = novosBlocos.filter(b => b.id !== 'subreceita-fixo');
      await saveConfiguration('markups_blocos', blocosParaSalvar);
    } catch (error) {
      console.error('Erro ao salvar blocos:', error);
      throw error;
    }
  }, [saveConfiguration]);

  // Efeito inicial
  useEffect(() => {
    carregarBlocos();
  }, [carregarBlocos]);

  // Adicionar novo bloco
  const adicionarBloco = () => {
    const novoBloco: MarkupBlockData = {
      id: Date.now().toString(),
      nome: `Markup ${blocos.length}`,
      lucroDesejado: 20
    };
    
    setBlocoEditando(novoBloco);
    setModalAberto(true);
  };

  // Editar nome do bloco
  const editarNomeBloco = async (id: string, novoNome: string) => {
    try {
      const novosBlocos = blocos.map(bloco => 
        bloco.id === id ? { ...bloco, nome: novoNome } : bloco
      );
      setBlocos(novosBlocos);
      await salvarBlocos(novosBlocos);
      
      toast({
        title: "Nome atualizado",
        description: "O nome do bloco foi alterado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar nome",
        description: "Não foi possível alterar o nome do bloco.",
        variant: "destructive"
      });
    }
  };

  // Deletar bloco
  const deletarBloco = async (id: string) => {
    try {
      const novosBlocos = blocos.filter(bloco => bloco.id !== id);
      setBlocos(novosBlocos);
      await salvarBlocos(novosBlocos);
      
      // Remover período salvo
      const novosperiodos = new Map(periodos);
      novosperiodos.delete(id);
      setPeriodos(novosperiodos);
      
      // Recalcular markups restantes
      await recalculateAllMarkups(novosBlocos);
      
      toast({
        title: "Bloco removido",
        description: "O bloco de markup foi removido com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao remover bloco",
        description: "Não foi possível remover o bloco de markup.",
        variant: "destructive"
      });
    }
  };

  // Atualizar lucro desejado
  const atualizarLucro = async (id: string, lucro: number) => {
    try {
      const novosBlocos = blocos.map(bloco => 
        bloco.id === id ? { ...bloco, lucroDesejado: lucro } : bloco
      );
      setBlocos(novosBlocos);
      await salvarBlocos(novosBlocos);
    } catch (error) {
      console.error('Erro ao atualizar lucro:', error);
    }
  };

  // Abrir configuração
  const abrirConfiguracao = (id: string) => {
    const bloco = blocos.find(b => b.id === id);
    if (bloco) {
      setBlocoEditando(bloco);
      setModalAberto(true);
    }
  };

  // Alterar período
  const alterarPeriodo = async (id: string, periodo: string) => {
    try {
      // Salvar período
      await saveConfiguration(`filtro-periodo-${id}`, periodo);
      
      // Atualizar estado local
      const novosperiodos = new Map(periodos);
      novosperiodos.set(id, periodo);
      setPeriodos(novosperiodos);
      
      // Recalcular apenas o bloco afetado
      const bloco = blocos.find(b => b.id === id);
      if (bloco) {
        await recalculateAllMarkups([bloco]);
      }
      
      toast({
        title: "Período alterado",
        description: `Cálculos atualizados para ${
          periodo === '1' ? 'último mês' :
          periodo === '3' ? 'últimos 3 meses' :
          periodo === '6' ? 'últimos 6 meses' :
          periodo === '12' ? 'últimos 12 meses' :
          'todos os períodos'
        }`,
      });
    } catch (error) {
      toast({
        title: "Erro ao alterar período",
        description: "Não foi possível alterar o período de cálculo.",
        variant: "destructive"
      });
    }
  };

  // Callback do modal
  const handleModalSuccess = async (blocoAtualizado: MarkupBlockData) => {
    try {
      let novosBlocos: MarkupBlockData[];
      
      if (blocos.some(b => b.id === blocoAtualizado.id)) {
        // Atualizar bloco existente
        novosBlocos = blocos.map(b => 
          b.id === blocoAtualizado.id ? blocoAtualizado : b
        );
      } else {
        // Adicionar novo bloco
        novosBlocos = [...blocos, blocoAtualizado];
      }
      
      setBlocos(novosBlocos);
      await salvarBlocos(novosBlocos);
      
      // Garantir que o período seja salvo para novos blocos
      if (!periodos.has(blocoAtualizado.id)) {
        await saveConfiguration(`filtro-periodo-${blocoAtualizado.id}`, '12');
        const novosperiodos = new Map(periodos);
        novosperiodos.set(blocoAtualizado.id, '12');
        setPeriodos(novosperiodos);
      }
      
      // Recalcular markups
      await recalculateAllMarkups(novosBlocos);
      
      setModalAberto(false);
      setBlocoEditando(null);
      
      toast({
        title: "Markup salvo",
        description: "As configurações foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Markups</h2>
          <p className="text-muted-foreground">
            Configure e calcule os markups para diferentes cenários
          </p>
        </div>
        <Button onClick={adicionarBloco}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Markup
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Calculando markups...</p>
        </div>
      )}

      <div className="grid gap-6">
        {blocos.map((bloco) => {
          const calculation = calculations.get(bloco.id) || {
            gastoSobreFaturamento: 0,
            impostos: 0,
            taxasMeiosPagamento: 0,
            comissoesPlataformas: 0,
            outros: 0,
            valorEmReal: 0
          };

          // Usar componente específico para subreceita
          if (bloco.id === 'subreceita-fixo') {
            return (
              <SubreceitaBlock
                key={bloco.id}
                calculation={calculation}
                lucroDesejado={bloco.lucroDesejado}
              />
            );
          }

          // Usar MarkupBlock para outros blocos
          return (
            <MarkupBlock
              key={bloco.id}
              block={bloco}
              calculation={calculation}
              currentPeriod={periodos.get(bloco.id)}
              onEditName={editarNomeBloco}
              onDelete={deletarBloco}
              onUpdateProfit={atualizarLucro}
              onOpenConfig={abrirConfiguracao}
              onChangePeriod={alterarPeriodo}
            />
          );
        })}
      </div>

      <CustosModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        markupBlock={blocoEditando}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}