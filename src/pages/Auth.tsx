import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  ArrowRight,
  Shield,
  CheckCircle,
  Users,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingUp,
  Trophy,
  PieChart,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { CONSENT_VERSION } from '@/lib/consent';



const InputField = ({ id, label, icon: Icon, type = 'text', placeholder, value, onChange, showPassword, onTogglePassword, required = true }: any) => (
  <div className="space-y-1.5 group">
    <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
        <Icon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      </div>
      <Input
        id={id}
        type={showPassword !== undefined ? (showPassword ? 'text' : 'password') : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pl-11 h-[52px] rounded-[14px] bg-background border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all text-sm"
        required={required}
      />
      {onTogglePassword && (
        <button
          type="button"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

const GoogleButton = ({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) => (
  <Button type="button" onClick={onClick} disabled={loading} variant="outline" className="w-full h-[52px] rounded-[14px] border-border/60 hover:bg-muted/40 transition-all text-sm font-medium">
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    {label}
  </Button>
);

const Auth = () => {
  const { t, i18n } = useTranslation();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginResend, setShowLoginResend] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword, resendConfirmation } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt-BR' ? 'en' : 'pt-BR';
    i18n.changeLanguage(newLang);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        let errorMessage = t('auth.checkCredentials');
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('auth.wrongEmailPassword');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('auth.emailNotConfirmedDesc');
          setShowLoginResend(true);
        }
        toast({ title: t('auth.loginError'), description: errorMessage, variant: 'destructive' });
        return;
      }
      toast({ title: t('auth.loginSuccess'), description: t('auth.welcomeBack') });
      navigate('/');
    } catch (error: any) {
      toast({ title: t('auth.unexpectedError'), description: error.message || t('auth.tryAgain'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms || !acceptPrivacy) {
      toast({
        title: 'Aceite necessário',
        description: 'Para criar sua conta, é necessário ler e aceitar os Termos de Uso e a Política de Privacidade.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signUp(email, password, fullName, businessName, phone);
      if (error) {
        let errorMessage = t('auth.tryAgain');
        if (error.message.includes('Password should be at least')) errorMessage = t('auth.passwordMinLength');
        else if (error.message.includes('Unable to validate email')) errorMessage = t('auth.invalidEmail');
        else if (error.message.includes('Signup requires a valid password')) errorMessage = t('auth.enterValidPassword');
        else if (error.message.includes('User already registered')) errorMessage = t('auth.alreadyRegistered');
        else errorMessage = error.message;
        toast({ title: t('auth.signupError'), description: errorMessage, variant: 'destructive' });
        return;
      }
      if (data?.user?.identities?.length === 0) {
        toast({ title: t('auth.emailAlreadyExists'), description: t('auth.emailAlreadyExistsDesc'), variant: 'destructive' });
        return;
      }

      const newUserId = data?.user?.id ?? null;
      if (newUserId) {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null;
        try {
          await supabase.from('user_consents').insert([
            { user_id: newUserId, consent_type: 'terms_of_use', accepted: true, version: CONSENT_VERSION, user_agent: ua },
            { user_id: newUserId, consent_type: 'privacy_policy', accepted: true, version: CONSENT_VERSION, user_agent: ua },
          ] as any);
        } catch (consentErr) {
          console.warn('[auth] Falha ao registrar consentimentos legais', consentErr);
        }
      }

      if (data?.session) {
        toast({ title: t('auth.accountCreated'), description: t('auth.welcomeBack') });
        navigate('/');
        return;
      }
      toast({ title: t('auth.accountCreated'), description: t('auth.confirmEmail') });
      setShowResendConfirmation(true);
    } catch (error: any) {
      toast({ title: t('auth.unexpectedError'), description: t('auth.tryAgain'), variant: 'destructive' });
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
      toast({ title: t('auth.emailSent'), description: t('auth.checkYourInbox') });
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      toast({ title: t('auth.sendError'), description: error.message || t('auth.tryAgain'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await resendConfirmation(email);
      if (error) throw error;
      toast({ title: t('auth.emailResent'), description: t('auth.checkYourBox') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('auth.tryAgain'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginResend = async () => {
    if (!loginEmail) {
      toast({ title: t('auth.emailNeeded'), description: t('auth.fillEmail'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await resendConfirmation(loginEmail);
      if (error) throw error;
      toast({ title: t('auth.emailResent'), description: t('auth.checkYourBox') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('auth.tryAgain'), variant: 'destructive' });
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
      toast({ title: t('auth.googleError'), description: error.message || t('auth.tryAgain'), variant: 'destructive' });
      setLoading(false);
    }
  };

  const Divider = () => (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">{t('auth.or')}</span></div>
    </div>
  );

  return (
    <div className="relative w-full min-h-screen lg:h-screen m-0 p-0 overflow-hidden bg-gradient-to-br from-background via-muted/40 to-background">
      {/* Fundo compartilhado — orbs decorativos cobrindo a tela inteira */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute -top-1/4 -left-[10%] w-[600px] h-[600px] rounded-full bg-[#0483e4]/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-[#7328b1]/12 blur-[120px]" />
        <div className="absolute -bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#dd0b52]/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-[10%] w-[500px] h-[500px] rounded-full bg-[#f96e0c]/10 blur-[120px]" />
      </div>

      {/* Grid conteúdo */}
      <div className="relative z-10 grid min-h-screen lg:h-screen lg:grid-cols-[62%_38%]">

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-30">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full h-9 px-3 text-xs font-bold text-muted-foreground bg-background/60 backdrop-blur-md"
          onClick={toggleLanguage}
        >
          {i18n.language === 'pt-BR' ? '🇺🇸 EN' : '🇧🇷 PT'}
        </Button>
      </div>

      {/* ============ HERO — coluna esquerda (desktop) ============ */}
      <div className="relative hidden lg:block overflow-hidden">



        {/* CAMADA 2 — Personagens em SVG articulado (pernas e braços de verdade) */}
        {/* Chef Homem — anda pra direita e volta */}
        <div className="absolute left-[4%] bottom-0 h-[70%] xl:h-[74%] pointer-events-none select-none motion-safe:chef-stroll-right">
          <AnimatedChef
            variant="walking"
            jacket="#ffffff"
            skin="#f4c9a0"
            hair="#3a2418"
            pants="#1f2937"
            accent="#0483e4"
            className="h-full w-auto drop-shadow-2xl"
          />
        </div>

        {/* Chef Mulher — parada no centro, conversando/gesticulando */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[82%] xl:h-[86%] pointer-events-none select-none z-[1]">
          <AnimatedChef
            variant="talking"
            jacket="#ffffff"
            skin="#f6d5b3"
            hair="#a0522d"
            pants="#111827"
            accent="#f96e0c"
            className="h-full w-auto drop-shadow-2xl"
          />
        </div>

        {/* Assistente — corre pra esquerda e volta */}
        <div className="absolute right-[4%] bottom-0 h-[68%] xl:h-[72%] pointer-events-none select-none motion-safe:chef-stroll-left">
          <AnimatedChef
            variant="running"
            jacket="#e0f2fe"
            skin="#e8b48c"
            hair="#1a1a1a"
            pants="#374151"
            accent="#8b5cf6"
            className="h-full w-auto drop-shadow-2xl"
          />
        </div>

        {/* CAMADA 3 — Conteúdo HTML */}
        {/* Título superior esquerdo */}
        <div className="absolute top-10 xl:top-14 left-8 xl:left-12 max-w-xl space-y-4 animate-fade-in z-10">
          <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold font-display leading-[1.05] text-foreground drop-shadow-sm">
            {t('auth.heroTitle1')}<br />
            {t('auth.heroTitle2')}<br />
            <span className="text-gradient-brand">{t('auth.heroTitle3')}</span>
          </h1>
          <p className="text-base xl:text-lg text-foreground/80 max-w-md leading-relaxed">
            {t('auth.heroSubtitle')}
          </p>
        </div>

      </div>


      {/* ============ AUTH — coluna direita ============ */}
      <div className="relative flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-10 overflow-y-auto">
        <div className="relative w-full max-w-[520px] space-y-5 animate-fade-in">


            {/* Mobile: faixa gradiente decorativa */}
            <div className="lg:hidden h-1.5 w-24 rounded-full bg-gradient-brand-horizontal mx-auto" />

            {/* Logo (oficial, contém nome — não renderizar título separado) */}
            <div className="flex justify-center lg:justify-start">
              <img
                src="/assets/logo-calculaai.png"
                alt="CalculaAi"
                className="h-14 lg:h-16 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center lg:text-left -mt-2">
              {t('auth.smartPricing')}
            </p>

            {/* Auth Card */}
            <Card className="bg-card/95 backdrop-blur-xl shadow-elevated border border-white/60 rounded-[28px] overflow-hidden">
              <div className="brand-line" />

              <CardContent className="p-6 sm:p-8">
                {showForgotPassword ? (
                  <div className="space-y-5 animate-fade-in">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                        <KeyRound className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold font-display">{t('auth.recoverPassword')}</h3>
                      <p className="text-sm text-muted-foreground">{t('auth.recoverInstructions')}</p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <InputField id="resetEmail" label={t('auth.email')} icon={Mail} type="email" placeholder={t('auth.emailPlaceholder')} value={resetEmail} onChange={(e: any) => setResetEmail(e.target.value)} />

                      <Button type="submit" disabled={loading} className="w-full h-[54px] rounded-[14px] bg-gradient-brand-horizontal text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 transition-all shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />{t('auth.sendInstructions')}</>}
                      </Button>

                      <Button type="button" variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full text-sm">
                        {t('auth.backToLogin')}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <Tabs defaultValue="login" className="space-y-5">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-2xl h-12">
                      <TabsTrigger value="login" className="data-[state=active]:bg-background data-[state=active]:shadow-soft data-[state=active]:text-primary rounded-xl text-sm font-semibold transition-all">
                        {t('auth.login')}
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:shadow-soft data-[state=active]:text-primary rounded-xl text-sm font-semibold transition-all">
                        {t('auth.signup')}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="animate-fade-in space-y-4 mt-0">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <InputField id="email" label={t('auth.email')} icon={Mail} type="email" placeholder={t('auth.emailPlaceholder')} value={loginEmail} onChange={(e: any) => setLoginEmail(e.target.value)} />
                        <InputField id="password" label={t('auth.password')} icon={Lock} placeholder={t('auth.passwordPlaceholder')} value={loginPassword} onChange={(e: any) => setLoginPassword(e.target.value)} showPassword={showLoginPassword} onTogglePassword={() => setShowLoginPassword(!showLoginPassword)} />

                        <Button type="submit" disabled={loading} className="w-full h-[54px] rounded-[14px] bg-gradient-brand-horizontal text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 transition-all shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)]">
                          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>{t('auth.login')}</span><ArrowRight className="h-4 w-4 ml-2" /></>}
                        </Button>

                        <Divider />
                        <GoogleButton label={t('auth.loginWithGoogle')} onClick={handleGoogleLogin} loading={loading} />

                        <div className="text-center">
                          <Button type="button" variant="link" onClick={() => setShowForgotPassword(true)} className="text-primary text-sm h-auto p-0">
                            {t('auth.forgotPassword')}
                          </Button>
                        </div>

                        {showLoginResend && (
                          <div className="p-3 bg-orange/5 border border-orange/20 rounded-xl space-y-2 animate-fade-in">
                            <p className="text-sm font-medium">{t('auth.emailNotConfirmed')}</p>
                            <p className="text-xs text-muted-foreground">{t('auth.checkInbox')}</p>
                            <Button type="button" onClick={handleLoginResend} disabled={loading} variant="outline" size="sm" className="w-full rounded-lg border-orange/30 text-sm">
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('auth.resendConfirmation')}
                            </Button>
                          </div>
                        )}
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="animate-fade-in space-y-4 mt-0">
                      <form onSubmit={handleSignup} className="space-y-3">
                        <InputField id="fullName" label={t('auth.fullName')} icon={User} placeholder={t('auth.namePlaceholder')} value={fullName} onChange={(e: any) => setFullName(e.target.value)} />
                        <InputField id="businessName" label={t('auth.businessName')} icon={Building2} placeholder={t('auth.businessPlaceholder')} value={businessName} onChange={(e: any) => setBusinessName(e.target.value)} />
                        <InputField id="phone" label={t('auth.phone')} icon={Phone} type="tel" placeholder={t('auth.phonePlaceholder')} value={phone} onChange={(e: any) => setPhone(e.target.value)} />
                        <InputField id="signupEmail" label={t('auth.email')} icon={Mail} type="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e: any) => setEmail(e.target.value)} />
                        <InputField id="signupPassword" label={t('auth.password')} icon={Lock} placeholder={t('auth.minChars')} value={password} onChange={(e: any) => setPassword(e.target.value)} showPassword={showSignupPassword} onTogglePassword={() => setShowSignupPassword(!showSignupPassword)} />

                        <div className="space-y-2 pt-1">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <Checkbox id="acceptTerms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" />
                            <span className="text-xs text-muted-foreground leading-snug">
                              Li e aceito os{' '}
                              <Link to="/termos-de-uso" target="_blank" className="text-primary underline underline-offset-2">Termos de Uso</Link>.
                            </span>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer">
                            <Checkbox id="acceptPrivacy" checked={acceptPrivacy} onCheckedChange={(v) => setAcceptPrivacy(v === true)} className="mt-0.5" />
                            <span className="text-xs text-muted-foreground leading-snug">
                              Li e aceito a{' '}
                              <Link to="/politica-de-privacidade" target="_blank" className="text-primary underline underline-offset-2">Política de Privacidade</Link>.
                            </span>
                          </label>
                        </div>

                        <Button type="submit" disabled={loading || !acceptTerms || !acceptPrivacy} className="w-full h-[54px] rounded-[14px] bg-gradient-brand-horizontal text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 transition-all shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] disabled:opacity-50 disabled:hover:translate-y-0">
                          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>{t('auth.signup')}</span><ArrowRight className="h-4 w-4 ml-2" /></>}
                        </Button>

                        <Divider />
                        <GoogleButton label={t('auth.signupWithGoogle')} onClick={handleGoogleLogin} loading={loading} />

                        {showResendConfirmation && (
                          <div className="text-center space-y-2 p-3 bg-primary/5 rounded-xl">
                            <p className="text-xs text-muted-foreground">{t('auth.didntReceive')}</p>
                            <Button type="button" variant="ghost" size="sm" onClick={handleResendConfirmation} disabled={loading} className="text-primary text-xs">
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />{t('auth.resendEmail')}
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
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>{t('auth.secureData')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t('auth.sslCertified')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-secondary" />
                <span>{t('auth.companies')}</span>
              </div>
            </div>

            <p className="text-center text-[11px] text-muted-foreground/60">
              {t('auth.copyright')}
            </p>
        </div>
      </div>
      </div>
    </div>

  );
};

export default Auth;
