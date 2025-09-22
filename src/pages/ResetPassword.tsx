import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se há tokens de reset na URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Definir a sessão com os tokens do URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi redefinida com sucesso",
      });

      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-muted/20 to-card">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse opacity-60"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse opacity-40" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/80 backdrop-blur-sm"></div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          <div className="text-center space-y-4">
            <img 
              src="/lovable-uploads/4b01991e-20ff-46b8-bab0-32a10b4650a6.png" 
              alt="CalculaAi Logo" 
              className="h-16 w-auto mx-auto"
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Redefinir Senha
            </h1>
            <p className="text-muted-foreground">
              Digite sua nova senha abaixo
            </p>
          </div>

          <Card className="card-premium shadow-2xl border-0 backdrop-blur-2xl bg-card/80">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold">Nova Senha</CardTitle>
              <CardDescription>
                Crie uma senha segura para sua conta
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2 group">
                  <Label htmlFor="password" className="text-base font-medium">Nova Senha</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 h-12 input-premium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">Confirmar Senha</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <CheckCircle className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Digite novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 h-12 input-premium"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 button-premium shadow-glow text-base font-semibold hover:scale-105 transition-all duration-300" 
                  variant="gradient"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Redefinindo...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Redefinir Senha</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;