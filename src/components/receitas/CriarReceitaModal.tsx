import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IngredientesStep } from './steps/IngredientesStep';
import { SubReceitasStep } from './steps/SubReceitasStep';
import { EmbalagensStep } from './steps/EmbalagensStep';
import { GeralStep } from './steps/GeralStep';
import { ProjecaoStep } from './steps/ProjecaoStep';
import { PrecificacaoStep } from './steps/PrecificacaoStep';

interface CriarReceitaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Interfaces for shared state
interface Ingrediente {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
  marcas?: string[];
}

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface MaoObraItem {
  id: string;
  funcionario: {
    id: string;
    nome: string;
    cargo: string;
    custo_por_hora: number;
  };
  tempo: number;
  valorTotal: number;
  unidadeTempo?: string;
}

interface ReceitaData {
  ingredientes: Ingrediente[];
  subReceitas: SubReceita[];
  embalagens: Embalagem[];
  maoObra: MaoObraItem[];
  rendimentoValor: string;
  rendimentoUnidade: string;
}

const steps = [
  { id: 'ingredientes', title: 'Ingredientes' },
  { id: 'sub-receitas', title: 'Sub-receitas' },
  { id: 'embalagens', title: 'Embalagens' },
  { id: 'geral', title: 'Geral' },
  { id: 'projecao', title: 'Projeção' },
  { id: 'precificacao', title: 'Precificação' },
];

export function CriarReceitaModal({ open, onOpenChange }: CriarReceitaModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Shared state for all recipe data
  const [receitaData, setReceitaData] = useState<ReceitaData>({
    ingredientes: [],
    subReceitas: [],
    embalagens: [],
    maoObra: [],
    rendimentoValor: '',
    rendimentoUnidade: 'unidade',
  });

  const updateReceitaData = (updates: Partial<ReceitaData>) => {
    setReceitaData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setReceitaData({
      ingredientes: [],
      subReceitas: [],
      embalagens: [],
      maoObra: [],
      rendimentoValor: '',
      rendimentoUnidade: 'unidade',
    });
    onOpenChange(false);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <IngredientesStep 
            ingredientes={receitaData.ingredientes}
            onIngredientesChange={(ingredientes) => updateReceitaData({ ingredientes })}
          />
        );
      case 1:
        return (
          <SubReceitasStep 
            subReceitas={receitaData.subReceitas}
            onSubReceitasChange={(subReceitas) => updateReceitaData({ subReceitas })}
          />
        );
      case 2:
        return (
          <EmbalagensStep 
            embalagens={receitaData.embalagens}
            onEmbalagensChange={(embalagens) => updateReceitaData({ embalagens })}
          />
        );
      case 3:
        return <GeralStep />;
      case 4:
        return (
          <ProjecaoStep 
            maoObra={receitaData.maoObra}
            rendimentoValor={receitaData.rendimentoValor}
            rendimentoUnidade={receitaData.rendimentoUnidade}
            onMaoObraChange={(maoObra) => updateReceitaData({ maoObra })}
            onRendimentoChange={(rendimentoValor, rendimentoUnidade) => 
              updateReceitaData({ rendimentoValor, rendimentoUnidade })
            }
          />
        );
      case 5:
        return <PrecificacaoStep receitaData={receitaData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Nova Receita - {steps[currentStep].title}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentStep + 1} de {steps.length}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex flex-wrap justify-center lg:justify-between items-center mb-4 gap-1">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span className={`ml-1 text-xs hidden sm:inline ${
                index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-6 h-px mx-2 hidden lg:block ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {currentStep === steps.length - 1 ? (
              <Button onClick={handleClose} className="gap-2">
                Finalizar Receita
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}