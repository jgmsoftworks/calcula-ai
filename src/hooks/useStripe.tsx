import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  subscribed: boolean;
  plan: string;
  subscription_end: string | null;
}

export const useStripe = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    plan: 'free',
    subscription_end: null
  });

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Erro ao verificar assinatura:', error);
        return;
      }
      
      setSubscriptionData(data);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    }
  };

  const createCheckout = async (planType: string, billing: 'monthly' | 'yearly' = 'monthly') => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para assinar um plano.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('[CHECKOUT] Iniciando checkout:', { planType, billing, userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType, billing }
      });
      
      console.log('[CHECKOUT] Resposta recebida:', { data, error });
      
      if (error) {
        console.error('[CHECKOUT] Erro na função:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log('[CHECKOUT] Redirecionando para:', data.url);
        window.open(data.url, '_blank');
        
        // Aguardar um pouco e verificar status da assinatura
        setTimeout(() => {
          checkSubscription();
        }, 2000);
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error) {
      console.error('[CHECKOUT] Erro completo:', error);
      
      let errorMessage = 'Erro ao processar pagamento. Tente novamente.';
      
      // Tratar diferentes tipos de erro
      if (error?.message) {
        if (error.message.includes('Authentication')) {
          errorMessage = 'Erro de autenticação. Faça login novamente.';
        } else if (error.message.includes('Invalid plan') || error.message.includes('price')) {
          errorMessage = 'Plano não disponível. Contate o suporte.';
        } else if (error.message.includes('configuração')) {
          errorMessage = 'Serviço de pagamento temporariamente indisponível.';
        }
      }
      
      toast({
        title: 'Erro no Pagamento',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Erro ao abrir portal:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao abrir portal de gerenciamento.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar assinatura quando o usuário muda
  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Verificar assinatura periodicamente (a cada 30 segundos)
  useEffect(() => {
    if (user) {
      const interval = setInterval(checkSubscription, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return {
    subscriptionData,
    loading,
    createCheckout,
    openCustomerPortal,
    checkSubscription
  };
};