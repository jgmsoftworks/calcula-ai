import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight,
  Shield,
  CheckCircle,
  Users,
  Sparkles,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(loginEmail, loginPassword);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao CalculaAi",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(email, password, fullName, businessName);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta. Não esqueça de verificar a pasta de spam.",
      });
      
      // Mostrar opção de reenviar confirmação
      setShowResendConfirmation(true);
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await resetPassword(resetEmail);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Email enviado!",
        description: "Verifique seu email para instruções de redefinição de senha.",
      });
      
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);

    try {
      const { error } = await resendConfirmation(email);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Email de confirmação reenviado!",
        description: "Verifique seu email, incluindo a pasta de spam.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao reenviar email",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // O redirecionamento será automático após o sucesso do OAuth
    } catch (error: any) {
      toast({
        title: "Erro no login com Google",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-muted/20 to-card">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse opacity-60"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse opacity-40" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-secondary/15 to-accent/15 rounded-full blur-2xl animate-pulse opacity-50" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-primary/30 rounded-full animate-bounce opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Glass Morphism Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/60 via-background/40 to-background/80 backdrop-blur-sm"></div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Logo Section with Enhanced Animation */}
          <div className="text-center space-y-4 animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative inline-block group">
              <img 
                src="/lovable-uploads/4b01991e-20ff-46b8-bab0-32a10b4650a6.png" 
                alt="CalculaAi Logo" 
                className="h-20 w-auto mx-auto transform group-hover:scale-110 transition-all duration-500 drop-shadow-2xl"
                style={{
                  filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.4)) drop-shadow(0 0 40px rgba(168, 85, 247, 0.2))"
                }}
              />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.4s' }}>
                CalculaAi
              </h1>
              <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.6s' }}>
                Precificação inteligente para seu negócio
              </p>
              
              {/* Premium Badge */}
              <div className="flex justify-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <Badge className="bg-gradient-primary text-white border-0 shadow-brand px-4 py-1 text-sm font-medium">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Versão Premium
                </Badge>
              </div>
            </div>
          </div>

          {/* Enhanced Auth Card */}
          <Card className="card-premium shadow-2xl border-0 backdrop-blur-2xl bg-card/80 animate-scale-in overflow-hidden" style={{ animationDelay: '1s' }}>
            {/* Card Header with Gradient */}
            <CardHeader className="relative pb-8 pt-8">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5"></div>
              <div className="relative space-y-2">
                <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Acesse sua conta
                </CardTitle>
                <CardDescription className="text-center text-muted-foreground text-lg">
                  Entre ou crie sua conta para começar
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-8 pt-0">
              {showForgotPassword ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center space-y-2">
                    <KeyRound className="h-12 w-12 mx-auto text-primary" />
                    <h3 className="text-xl font-semibold">Recuperar Senha</h3>
                    <p className="text-muted-foreground">Digite seu email para receber instruções</p>
                  </div>
                  
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2 group">
                      <Label htmlFor="resetEmail" className="text-base font-medium">Email</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                          <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        <Input
                          id="resetEmail"
                          type="email"
                          placeholder="seu@email.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="pl-12 h-12 input-premium"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 button-premium"
                        variant="gradient"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Enviando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>Enviar instruções</span>
                          </div>
                        )}
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="ghost"
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full"
                      >
                        Voltar ao login
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <Tabs defaultValue="login" className="space-y-8">
                  {/* Enhanced Tab List */}
                  <TabsList className="grid w-full grid-cols-2 bg-gradient-glass border border-border/50 p-1.5 rounded-2xl h-14">
                    <TabsTrigger 
                      value="login" 
                      className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow rounded-xl transition-all duration-500 text-base font-medium data-[state=active]:scale-105"
                    >
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup" 
                      className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow rounded-xl transition-all duration-500 text-base font-medium data-[state=active]:scale-105"
                    >
                      Criar conta
                    </TabsTrigger>
                  </TabsList>

                <TabsContent value="login" className="animate-fade-in">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2 group">
                        <Label htmlFor="email" className="text-base font-medium text-foreground">Email</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                          </div>
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 group">
                        <Label htmlFor="password" className="text-base font-medium text-foreground">Senha</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                          </div>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 button-premium shadow-glow text-base font-semibold hover:scale-105 transition-all duration-300" 
                        variant="gradient"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Entrando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>Entrar</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                       </Button>
                       
                       {/* Divider */}
                       <div className="relative">
                         <div className="absolute inset-0 flex items-center">
                           <span className="w-full border-t border-border/50" />
                         </div>
                         <div className="relative flex justify-center text-xs uppercase">
                           <span className="bg-card px-2 text-muted-foreground">ou</span>
                         </div>
                       </div>

                       {/* Google Login Button */}
                       <Button 
                         type="button"
                         onClick={handleGoogleLogin}
                         disabled={loading}
                         variant="outline"
                         className="w-full h-12 border-border/50 hover:bg-accent/50 transition-all duration-300"
                       >
                         <div className="flex items-center space-x-2">
                           <svg className="h-5 w-5" viewBox="0 0 24 24">
                             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                           </svg>
                           <span>Entrar com Google</span>
                         </div>
                       </Button>
                       
                       <div className="text-center">
                        <Button 
                          type="button"
                          variant="link"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-primary hover:text-primary-glow transition-colors text-sm"
                        >
                          Esqueceu sua senha?
                        </Button>
                      </div>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="animate-fade-in">
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2 group">
                        <Label htmlFor="fullName" className="text-base font-medium text-foreground">Nome Completo</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <User className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                          </div>
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Digite seu nome completo"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 group">
                        <Label htmlFor="businessName" className="text-base font-medium text-foreground">Nome do Negócio</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Building2 className="h-5 w-5 text-muted-foreground group-focus-within:text-secondary transition-colors duration-300" />
                          </div>
                          <Input
                            id="businessName"
                            type="text"
                            placeholder="Nome da sua empresa"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-secondary/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 group">
                        <Label htmlFor="signupEmail" className="text-base font-medium text-foreground">Email</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-accent transition-colors duration-300" />
                          </div>
                          <Input
                            id="signupEmail"
                            type="email"
                            placeholder="seuemail@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-accent/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2 group">
                        <Label htmlFor="signupPassword" className="text-base font-medium text-foreground">Senha</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                            <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
                          </div>
                          <Input
                            id="signupPassword"
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-12 h-12 input-premium text-base bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 button-premium shadow-glow text-base font-semibold hover:scale-105 transition-all duration-300" 
                        variant="gradient"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Criando conta...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>Criar conta</span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                       </Button>
                       
                       {/* Divider */}
                       <div className="relative">
                         <div className="absolute inset-0 flex items-center">
                           <span className="w-full border-t border-border/50" />
                         </div>
                         <div className="relative flex justify-center text-xs uppercase">
                           <span className="bg-card px-2 text-muted-foreground">ou</span>
                         </div>
                       </div>

                       {/* Google Login Button */}
                       <Button 
                         type="button"
                         onClick={handleGoogleLogin}
                         disabled={loading}
                         variant="outline"
                         className="w-full h-12 border-border/50 hover:bg-accent/50 transition-all duration-300"
                       >
                         <div className="flex items-center space-x-2">
                           <svg className="h-5 w-5" viewBox="0 0 24 24">
                             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                           </svg>
                           <span>Cadastrar com Google</span>
                         </div>
                       </Button>
                       
                       {showResendConfirmation && (
                        <div className="text-center space-y-2 p-4 bg-primary/10 rounded-lg">
                          <p className="text-sm text-muted-foreground">Não recebeu o email de confirmação?</p>
                          <Button 
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResendConfirmation}
                            disabled={loading}
                            className="text-primary hover:text-primary-glow"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reenviar email
                          </Button>
                        </div>
                      )}
                    </div>
                  </form>
                </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Footer with Trust Indicators */}
          <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '1.4s' }}>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1 group cursor-pointer">
                <Shield className="h-4 w-4 text-primary group-hover:text-primary-glow transition-colors" />
                <span className="group-hover:text-primary transition-colors">Dados seguros</span>
              </div>
              <div className="flex items-center space-x-1 group cursor-pointer">
                <CheckCircle className="h-4 w-4 text-green-500 group-hover:text-green-400 transition-colors" />
                <span className="group-hover:text-green-400 transition-colors">SSL certificado</span>
              </div>
              <div className="flex items-center space-x-1 group cursor-pointer">
                <Users className="h-4 w-4 text-secondary group-hover:text-secondary/80 transition-colors" />
                <span className="group-hover:text-secondary transition-colors">+1000 empresas</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2024 CalculaAi. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;