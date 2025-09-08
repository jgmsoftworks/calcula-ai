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
  Sparkles
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

  const { signIn, signUp } = useAuth();
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
      await signUp(email, password, fullName, businessName);
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar a conta",
      });
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
              <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-all duration-500 animate-pulse"></div>
              <div className="relative bg-gradient-primary p-6 rounded-3xl shadow-glow">
                <Calculator className="h-16 w-16 text-white mx-auto transform group-hover:scale-110 transition-transform duration-500" />
              </div>
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
                  </form>
                </TabsContent>
              </Tabs>
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