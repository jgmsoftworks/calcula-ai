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

const steps = [
  { id: 'ingredientes', title: 'Ingredientes', component: IngredientesStep },
  { id: 'sub-receitas', title: 'Sub-receitas', component: SubReceitasStep },
  { id: 'embalagens', title: 'Embalagens', component: EmbalagensStep },
  { id: 'geral', title: 'Geral', component: GeralStep },
  { id: 'projecao', title: 'Projeção', component: ProjecaoStep },
  { id: 'precificacao', title: 'Precificação', component: PrecificacaoStep },
];

export function CriarReceitaModal({ open, onOpenChange }: CriarReceitaModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

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
    onOpenChange(false);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Nova Receita - {steps[currentStep].title}</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {currentStep + 1} de {steps.length}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex justify-between items-center mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${
                index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-px mx-4 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          <CurrentStepComponent />
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