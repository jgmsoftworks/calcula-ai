import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Upload, 
  Moon, 
  Sun, 
  Palette,
  Save,
  User,
  Mail,
  Phone,
  Camera
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { useUserConfigurations } from '@/hooks/useUserConfigurations';

interface BusinessProfile {
  business_name: string;
  business_type: string;
  logo_url?: string;
  primary_color?: string;
}

interface UserProfile {
  full_name: string;
  phone?: string;
  business_name?: string;
  business_type?: string;
}

const PerfilNegocio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { saveConfiguration, loadConfiguration } = useUserConfigurations();
  
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    business_name: '',
    business_type: 'food'
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadLogo();
  }, []);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          business_name: data.business_name || '',
          business_type: data.business_type || 'food'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadLogo = async () => {
    const logoConfig = await loadConfiguration('business_logo');
    if (logoConfig && typeof logoConfig === 'string') {
      setLogoPreview(logoConfig);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          business_name: profile.business_name,
          business_type: profile.business_type
        });

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O logo deve ter no máximo 2MB",
          variant: "destructive"
        });
        return;
      }

      setLogoFile(file);
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveLogo = async () => {
    if (!logoFile) return;

    setIsLoading(true);
    try {
      // Salvar preview na configuração do usuário
      await saveConfiguration('business_logo', logoPreview);
      
      toast({
        title: "Logo atualizado",
        description: "Seu logo foi salvo com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar logo",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Perfil de Negócio</h1>
          <p className="text-muted-foreground">
            Personalize seu sistema e gerencie suas informações
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Pessoais */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Informações Pessoais
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Digite seu nome completo"
                className="input-premium"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações do Negócio */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-secondary" />
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                Informações do Negócio
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nome do Negócio</Label>
              <Input
                id="business_name"
                value={profile.business_name}
                onChange={(e) => setProfile(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Digite o nome do seu negócio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Tipo de Negócio</Label>
              <select
                id="business_type"
                value={profile.business_type}
                onChange={(e) => setProfile(prev => ({ ...prev, business_type: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="food">Alimentação</option>
                <option value="retail">Varejo</option>
                <option value="service">Serviços</option>
                <option value="manufacturing">Indústria</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <Button 
              onClick={handleProfileUpdate}
              disabled={isLoading}
              className="w-full button-premium"
              variant="gradient"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Logo do Negócio */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-accent" />
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Logo do Negócio
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-col items-center space-y-4">
              {logoPreview ? (
                <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center bg-muted">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Nenhum logo</p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    Escolher Logo
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </Label>
                
                {logoFile && (
                  <Button onClick={saveLogo} disabled={isLoading} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Logo
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Formatos aceitos: JPG, PNG. Máximo 2MB.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Aparência */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple" />
              <span className="bg-gradient-to-r from-purple to-primary bg-clip-text text-transparent">
                Aparência do Sistema
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <div className="flex items-center justify-between p-4 bg-gradient-glass rounded-xl border border-border/50">
              <div className="space-y-1">
                <Label className="text-base font-medium">Modo Escuro</Label>
                <p className="text-sm text-muted-foreground">
                  Alternar entre tema claro e escuro
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-orange transition-all duration-300" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  className="data-[state=checked]:bg-gradient-primary"
                />
                <Moon className="h-5 w-5 text-primary transition-all duration-300" />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-medium">Tema Atual</Label>
              <div className="flex gap-3">
                <Badge 
                  variant={theme === 'light' ? 'default' : 'secondary'}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300 ${
                    theme === 'light' 
                      ? 'bg-gradient-to-r from-orange to-orange-light text-white shadow-orange' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  Tema Claro
                </Badge>
                <Badge 
                  variant={theme === 'dark' ? 'default' : 'secondary'}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-gradient-primary text-white shadow-brand' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  Tema Escuro
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerfilNegocio;