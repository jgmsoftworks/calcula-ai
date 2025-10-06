import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const reasonSchema = z.string()
  .min(10, 'Motivo deve ter no mínimo 10 caracteres')
  .max(500, 'Motivo deve ter no máximo 500 caracteres');

interface EditUserPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    full_name: string;
    business_name: string;
    plan: string;
  };
  onSuccess: () => void;
}

const planNames = {
  free: 'Gratuito',
  professional: 'Professional',
  enterprise: 'Enterprise'
};

export const EditUserPlanModal = ({ open, onOpenChange, user, onSuccess }: EditUserPlanModalProps) => {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedPlan) {
      toast({
        title: "Erro",
        description: "Selecione um plano",
        variant: "destructive",
      });
      return;
    }

    // Validate reason
    const reasonValidation = reasonSchema.safeParse(reason.trim());
    if (!reasonValidation.success) {
      toast({
        title: "Erro no motivo",
        description: reasonValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-plan', {
        body: {
          userId: user.user_id,
          newPlan: selectedPlan,
          expiresAt: expiresAt ? expiresAt.toISOString() : null,
          reason: reason.trim()
        }
      });

      if (error) throw error;

      if (data?.stripeWarning) {
        toast({
          title: "⚠️ Atenção",
          description: data.stripeWarning.message,
          duration: 8000,
        });
      }

      toast({
        title: "Plano atualizado",
        description: `Plano alterado de ${planNames[user.plan as keyof typeof planNames]} para ${planNames[selectedPlan as keyof typeof planNames]}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro ao atualizar plano",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Plano do Usuário</DialogTitle>
          <DialogDescription>
            Altere manualmente o plano e defina validade se necessário
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações do usuário */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Usuário:</span>
              <span className="text-sm text-muted-foreground">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Empresa:</span>
              <span className="text-sm text-muted-foreground">{user.business_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plano Atual:</span>
              <Badge variant="outline">{planNames[user.plan as keyof typeof planNames]}</Badge>
            </div>
          </div>

          {/* Seletor de plano */}
          <div className="space-y-2">
            <Label htmlFor="plan">Novo Plano</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de expiração */}
          {selectedPlan !== 'free' && (
            <div className="space-y-2">
              <Label>Data de Expiração (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiresAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiresAt ? format(expiresAt, "PPP", { locale: ptBR }) : "Sem data de expiração"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiresAt}
                    onSelect={setExpiresAt}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Deixe vazio para acesso sem limite de tempo
              </p>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Alteração *</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Cliente solicitou upgrade temporário, teste de funcionalidades, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será registrado no histórico de auditoria
            </p>
          </div>

          {/* Aviso sobre Stripe */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Se o usuário tiver uma assinatura ativa no Stripe, você será notificado após a alteração.
              Considere cancelar a assinatura no painel do Stripe se necessário.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar Plano'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
