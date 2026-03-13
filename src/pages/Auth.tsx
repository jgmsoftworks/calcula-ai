import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight,
  Shield,
  CheckCircle,
  Users,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const InputField = ({ id, label, icon: Icon, type = "text", placeholder, value, onChange, showPassword, onTogglePassword, required = true }: any) => (
  <div className="space-y-1.5 group">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Icon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      </div>
      <Input
        id={id}
        type={showPassword !== undefined ? (showPassword ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-10 h-11 rounded-xl bg-muted/30 border-border/40 focus:border-primary/50 focus:bg-background transition-all text-sm"
        required={required}
      />
      {onTogglePassword && (
        <button type="button" onClick={onTogglePassword} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

const GoogleButton = ({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) => (
  <Button type="button" onClick={onClick} disabled={loading} variant="outline" className="w-full h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all text-sm">
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    {label}
  </Button>
);

const Divider = () => (
  <div className="relative my-4">
    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">ou</span></div>
  </div>
);

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginResend, setShowLoginResend] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        let errorMessage = "Verifique suas credenciais";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Email ou senha incorretos";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Seu email ainda não foi confirmado.";
          setShowLoginResend(true);
        }
        toast({ title: "Erro no login", description: errorMessage, variant: "destructive" });
        return;
      }
      toast({ title: "Login realizado!", description: "Bem-vindo de volta" });
      navigate('/');
    } catch (error: any) {
      toast({ title: "Erro inesperado", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password, fullName, businessName);
      if (error) {
        let errorMessage = "Tente novamente";
        if (error.message.includes("Password should be at least")) errorMessage = "A senha deve ter no mínimo 6 caracteres";
        else if (error.message.includes("Unable to validate email")) errorMessage = "Email inválido.";
        else if (error.message.includes("Signup requires a valid password")) errorMessage = "Digite uma senha válida";
        else if (error.message.includes("User already registered")) errorMessage = "Este email já possui uma conta.";
        else errorMessage = error.message;
        toast({ title: "Erro ao criar conta", description: errorMessage, variant: "destructive" });
        return;
      }
      if (data?.user?.identities?.length === 0) {
        toast({ title: "Email já cadastrado", description: "Tente fazer login ou recuperar sua senha.", variant: "destructive" });
        return;
      }
      toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      setShowResendConfirmation(true);
    } catch (error: any) {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await resetPassword(resetEmail);
      if (error) throw error;
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await resendConfirmation(email);
      if (error) throw error;
      toast({ title: "Email reenviado!", description: "Verifique sua caixa." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginResend = async () => {
    if (!loginEmail) {
      toast({ title: "Email necessário", description: "Preencha o campo de email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await resendConfirmation(loginEmail);
      if (error) throw error;
      toast({ title: "Email reenviado!", description: "Verifique sua caixa." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Erro no login com Google", description: error.message || "Tente novamente", variant: "destructive" });
      setLoading(false);
    }
  };

  const InputField = ({ id, label, icon: Icon, type = "text", placeholder, value, onChange, showPassword, onTogglePassword, required = true }: any) => (
    <div className="space-y-1.5 group">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          id={id}
          type={showPassword !== undefined ? (showPassword ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="pl-10 h-11 rounded-xl bg-muted/30 border-border/40 focus:border-primary/50 focus:bg-background transition-all text-sm"
          required={required}
        />
        {onTogglePassword && (
          <button type="button" onClick={onTogglePassword} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );

  const GoogleButton = ({ label }: { label: string }) => (
    <Button type="button" onClick={handleGoogleLogin} disabled={loading} variant="outline" className="w-full h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all text-sm">
      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </Button>
  );

  const Divider = () => (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">ou</span></div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-[#0483e4]/8 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-[#7328b1]/8 blur-[120px]" />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-[#dd0b52]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-[420px] space-y-6 animate-fade-in">
          
          {/* Logo */}
          <div className="text-center space-y-3">
            <img 
              src="/lovable-uploads/4b01991e-20ff-46b8-bab0-32a10b4650a6.png" 
              alt="CalculaAi Logo" 
              className="h-16 w-auto mx-auto"
            />
            <div>
              <h1 className="text-3xl font-bold font-display text-gradient-brand">
                CalculaAi
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Precificação inteligente para seu negócio
              </p>
            </div>
          </div>

          {/* Auth Card */}
          <Card className="glass-card shadow-elevated border-0 overflow-hidden">
            {/* Brand gradient line */}
            <div className="brand-line" />
            
            <CardContent className="p-6">
              {showForgotPassword ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <KeyRound className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold font-display">Recuperar Senha</h3>
                    <p className="text-sm text-muted-foreground">Digite seu email para receber instruções</p>
                  </div>
                  
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <InputField id="resetEmail" label="Email" icon={Mail} type="email" placeholder="seu@email.com" value={resetEmail} onChange={(e: any) => setResetEmail(e.target.value)} />
                    
                    <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity">
                      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />Enviar instruções</>}
                    </Button>
                    
                    <Button type="button" variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full text-sm">
                      Voltar ao login
                    </Button>
                  </form>
                </div>
              ) : (
                <Tabs defaultValue="login" className="space-y-5">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl h-11">
                    <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-soft rounded-lg text-sm font-medium transition-all">
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-soft rounded-lg text-sm font-medium transition-all">
                      Criar conta
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="animate-fade-in space-y-4 mt-0">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <InputField id="email" label="Email" icon={Mail} type="email" placeholder="seu@email.com" value={loginEmail} onChange={(e: any) => setLoginEmail(e.target.value)} />
                      <InputField id="password" label="Senha" icon={Lock} placeholder="••••••••" value={loginPassword} onChange={(e: any) => setLoginPassword(e.target.value)} showPassword={showLoginPassword} onTogglePassword={() => setShowLoginPassword(!showLoginPassword)} />
                      
                      <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Entrar</span><ArrowRight className="h-4 w-4 ml-2" /></>}
                      </Button>
                      
                      <Divider />
                      <GoogleButton label="Entrar com Google" />
                      
                      <div className="text-center">
                        <Button type="button" variant="link" onClick={() => setShowForgotPassword(true)} className="text-primary text-sm h-auto p-0">
                          Esqueceu sua senha?
                        </Button>
                      </div>

                      {showLoginResend && (
                        <div className="p-3 bg-orange/5 border border-orange/20 rounded-xl space-y-2 animate-fade-in">
                          <p className="text-sm font-medium">⚠️ Email não confirmado</p>
                          <p className="text-xs text-muted-foreground">Verifique sua caixa de entrada e spam.</p>
                          <Button type="button" onClick={handleLoginResend} disabled={loading} variant="outline" size="sm" className="w-full rounded-lg border-orange/30 text-sm">
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reenviar confirmação
                          </Button>
                        </div>
                      )}
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="animate-fade-in space-y-4 mt-0">
                    <form onSubmit={handleSignup} className="space-y-3">
                      <InputField id="fullName" label="Nome Completo" icon={User} placeholder="Seu nome" value={fullName} onChange={(e: any) => setFullName(e.target.value)} />
                      <InputField id="businessName" label="Nome do Negócio" icon={Building2} placeholder="Sua empresa" value={businessName} onChange={(e: any) => setBusinessName(e.target.value)} />
                      <InputField id="signupEmail" label="Email" icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                      <InputField id="signupPassword" label="Senha" icon={Lock} placeholder="Mínimo 6 caracteres" value={password} onChange={(e: any) => setPassword(e.target.value)} showPassword={showSignupPassword} onTogglePassword={() => setShowSignupPassword(!showSignupPassword)} />
                      
                      <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-gradient-brand text-white font-semibold hover:opacity-90 transition-opacity">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Criar conta</span><ArrowRight className="h-4 w-4 ml-2" /></>}
                      </Button>
                      
                      <Divider />
                      <GoogleButton label="Cadastrar com Google" />
                      
                      {showResendConfirmation && (
                        <div className="text-center space-y-2 p-3 bg-primary/5 rounded-xl">
                          <p className="text-xs text-muted-foreground">Não recebeu o email?</p>
                          <Button type="button" variant="ghost" size="sm" onClick={handleResendConfirmation} disabled={loading} className="text-primary text-xs">
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reenviar email
                          </Button>
                        </div>
                      )}
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Trust indicators */}
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Dados seguros</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>SSL certificado</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-secondary" />
              <span>+1000 empresas</span>
            </div>
          </div>
          
          <p className="text-center text-[11px] text-muted-foreground/60">
            © 2024 CalculaAi. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
