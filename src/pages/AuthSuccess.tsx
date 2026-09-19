import { trackVerifiedPurchase } from '@/lib/funnel-analytics';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (user) {
      // Usuário já está logado, redireciona para dashboard
      navigate('/', { replace: true });
      return;
    }

    if (sessionId) {
      processStripeSession();
    } else {
      toast({
        title: 'Erro',
        description: 'Session ID não encontrado',
        variant: 'destructive'
      });
      navigate('/auth', { replace: true });
    }
  }, [sessionId, user]);

  const processStripeSession = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('process-stripe-payment', {
        body: { session_id: sessionId }
      });

      if (error) {
        console.error('Erro na função process-stripe-payment:', error);
        throw error;
      }

      if (data?.success === true && sessionId) trackVerifiedPurchase(sessionId);
      if (data.user_exists) {
        // Usuário já existe, redirecionar para login
        toast({
          title: '✅ Pagamento confirmado!',
          description: 'Redirecionando para login...'
        });
        
        setTimeout(() => {
          navigate(`/auth?email=${encodeURIComponent(data.customer_email)}&plan=${data.plan}`, { replace: true });
        }, 1500);
      } else {
        // Usuário não existe, mostrar formulário de cadastro
        setShowSignupForm(true);
        setFormData(prev => ({
          ...prev,
          fullName: data.customer_name || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      
      // Mensagens de erro mais específicas
      let errorMessage = 'Erro ao processar seu pagamento. Tente novamente.';
      
      if (error?.message?.includes('session_id')) {
        errorMessage = 'Session de pagamento inválida. Tente fazer um novo pagamento.';
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
      navigate('/auth', { replace: true });
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

      if (error) {
        throw error;
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

  if (!showSignupForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="animate-pulse mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LoadingSpinner className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-green-600">Pagamento confirmado!</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Redirecionando você para sua conta...
          </p>
        </div>
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
