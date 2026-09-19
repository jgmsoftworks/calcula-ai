import { trackVerifiedPurchase } from '@/lib/funnel-analytics';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const AuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [confirmation, setConfirmation] = useState<{ user_exists: boolean; customer_email: string } | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      processStripeSession();
    } else {
      setPaymentError('Não encontramos a identificação do pagamento. Use o link de retorno da Stripe ou entre em contato com o suporte.');
      setLoading(false);
    }
  }, [sessionId]);

  const processStripeSession = async () => {
    try {
      setLoading(true);
      setPaymentError('');
      setConfirmation(null);
      
      const { data, error } = await supabase.functions.invoke('process-stripe-payment', {
        body: { session_id: sessionId }
      });

      if (error) {
        console.error('Erro na função process-stripe-payment:', error);
        throw error;
      }

      if (data?.success !== true || !data.customer_email || typeof data.user_exists !== 'boolean') {
        throw new Error('Não foi possível confirmar o pagamento.');
      }
      if (sessionId) trackVerifiedPurchase(sessionId);
      setConfirmation({ user_exists: data.user_exists, customer_email: data.customer_email });
      setFormData(prev => ({ ...prev, fullName: data.customer_name || '' }));
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao processar seu pagamento. Tente novamente.';
      
      if (error?.message?.includes('session_id')) {
        errorMessage = 'Identificação do pagamento inválida. Consulte seu comprovante ou o suporte antes de tentar novamente.';
      } else if (error?.message?.includes('Payment not completed')) {
        errorMessage = 'Pagamento não foi concluído. Verifique seu método de pagamento.';
      } else if (error?.message?.includes('Failed to check existing users')) {
        errorMessage = 'Erro temporário no sistema. Tente novamente em alguns minutos.';
      }
      
      toast({
        title: 'Erro no processamento',
        description: errorMessage,
        variant: 'destructive'
      });
      setPaymentError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive'
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);

      // Reprocessar com dados de cadastro
      const { data, error } = await supabase.functions.invoke('process-stripe-payment', {
        body: { 
          session_id: sessionId,
          signup_data: {
            full_name: formData.fullName,
            password: formData.password
          }
        }
      });

      if (error || data?.success !== true || !data.customer_email) {
        throw error || new Error('Não foi possível concluir o cadastro.');
      }

      toast({
        title: '🎉 Conta criada com sucesso!',
        description: 'Fazendo login...'
      });

      // Fazer login normal com as credenciais
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.customer_email,
        password: formData.password
      });

      if (signInError) {
        throw signInError;
      }

      // Redirecionar após login bem-sucedido
      setTimeout(() => {
        navigate(`/?welcome=true&plan=${data.plan}`, { replace: true });
      }, 1000);

    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        title: 'Erro no cadastro',
        description: 'Erro ao criar sua conta. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="animate-pulse mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <LoadingSpinner className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Processando seu pagamento</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Estamos confirmando seu pagamento e preparando sua conta. Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    );
  }

  if (paymentError || !confirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md"><CardContent className="pt-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Ainda não confirmamos seu pagamento</h1>
          <p role="alert">{paymentError || 'Aguarde a confirmação da Stripe.'}</p>
          <p className="text-sm text-muted-foreground">Se você já pagou, não faça uma nova compra. A confirmação pode levar alguns instantes.</p>
          {sessionId && <Button onClick={processStripeSession}>Verificar novamente</Button>}
          <p><a href="mailto:calculaai.adm@gmail.com" className="underline">Falar com o suporte por e-mail</a></p>
        </CardContent></Card>
      </div>
    );
  }

  if (!showSignupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md"><CardContent className="pt-6 space-y-4 text-center">
          <h1 className="text-2xl font-bold text-green-600">Pagamento confirmado!</h1>
          <p className="text-muted-foreground">{confirmation.user_exists ? 'Seu plano está vinculado à conta do e-mail usado na compra. Entre para continuar.' : 'Agora é só finalizar seu cadastro para começar a usar o Calcula Aí.'}</p>
          <Button className="w-full" onClick={() => {
            if (confirmation.user_exists) navigate(`/auth?mode=login&email=${encodeURIComponent(confirmation.customer_email)}`, { replace: true });
            else setShowSignupForm(true);
          }}>Conhecer o sistema</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-8 h-8 text-green-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Finalize seu cadastro</h1>
            <p className="text-muted-foreground mt-2">
              Seu pagamento foi processado com sucesso! Complete seus dados para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Criar senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="mt-1"
                placeholder="Mínimo 6 caracteres"
              />
              {formData.password.length > 0 && formData.password.length < 6 && (
                <p className="text-xs text-red-500 mt-1">A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
                className="mt-1"
                placeholder="Digite a senha novamente"
              />
              {formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={processing}
            >
              {processing ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Criando conta...
                </>
              ) : (
                'Criar conta e acessar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthSuccess;
