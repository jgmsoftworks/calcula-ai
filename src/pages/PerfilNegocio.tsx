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
  Phone,
  Camera,
  MapPin,
  Mail,
  FileText,
  Search,
  ImageIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { useOptimizedUserConfigurations } from '@/hooks/useOptimizedUserConfigurations';

interface BusinessProfile {
  business_name: string;
  business_type: string;
  logo_url?: string;
  primary_color?: string;
}

interface UserProfile {
  id?: string; // Add ID for profile updates
  full_name: string;
  phone?: string;
  business_name?: string;
  business_type?: string;
  
  // Dados da empresa
  cnpj_cpf?: string;
  razao_social?: string;
  nome_fantasia?: string;
  
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  
  // Contatos
  telefone_comercial?: string;
  celular?: string;
  email_comercial?: string;
  instagram?: string;
  
  // Informações empresariais
  setor_atividade?: string;
  descricao_empresa?: string;
  data_abertura?: string;
  regime_tributario?: string;
  porte_empresa?: string;
  
  // Responsável
  responsavel_nome?: string;
  responsavel_cargo?: string;
  responsavel_cpf?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  
  // Configurações visuais
  logo_empresa_url?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
}

const PerfilNegocio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { saveConfiguration, loadConfiguration } = useOptimizedUserConfigurations();
  
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    business_name: '',
    business_type: 'food',
    cnpj_cpf: '',
    razao_social: '',
    nome_fantasia: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    telefone_comercial: '',
    celular: '',
    email_comercial: '',
    instagram: '',
    setor_atividade: '',
    descricao_empresa: '',
    data_abertura: '',
    regime_tributario: '',
    porte_empresa: '',
    responsavel_nome: '',
    responsavel_cargo: '',
    responsavel_cpf: '',
    responsavel_email: '',
    responsavel_telefone: '',
    logo_empresa_url: '',
    cor_primaria: '',
    cor_secundaria: ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const [semNumero, setSemNumero] = useState(false);

  // Formatting functions
  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .substring(0, 14);
  };

  const formatCNPJCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return formatCPF(value);
    }
    return formatCNPJ(value);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 14);
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Carregar logo após o profile
  useEffect(() => {
    loadLogo();
  }, [profile.logo_empresa_url]);

  // Initialize semNumero state based on profile data
  useEffect(() => {
    setSemNumero(profile.numero === 'S/N');
  }, [profile.numero]);

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
          id: data.id, // Include the profile ID
          full_name: data.full_name || '',
          phone: data.phone || '',
          business_name: data.business_name || '',
          business_type: data.business_type || 'food',
          cnpj_cpf: data.cnpj_cpf || '',
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          cep: data.cep || '',
          logradouro: data.logradouro || '',
          numero: data.numero || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          pais: data.pais || 'Brasil',
          telefone_comercial: data.telefone_comercial || '',
          celular: data.celular || '',
          email_comercial: data.email_comercial || '',
          instagram: data.instagram || '',
          setor_atividade: data.setor_atividade || '',
          descricao_empresa: data.descricao_empresa || '',
          data_abertura: data.data_abertura || '',
          regime_tributario: data.regime_tributario || '',
          porte_empresa: data.porte_empresa || '',
          responsavel_nome: data.responsavel_nome || '',
          responsavel_cargo: data.responsavel_cargo || '',
          responsavel_cpf: data.responsavel_cpf || '',
          responsavel_email: data.responsavel_email || '',
          responsavel_telefone: data.responsavel_telefone || '',
          logo_empresa_url: data.logo_empresa_url || '',
          cor_primaria: data.cor_primaria || '',
          cor_secundaria: data.cor_secundaria || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadLogo = async () => {
    // Priorizar logo_empresa_url do profile (salvo no Storage)
    if (profile.logo_empresa_url) {
      setLogoPreview(profile.logo_empresa_url);
      return;
    }
    // Fallback para configuração antiga
    const logoConfig = await loadConfiguration('business_logo');
    if (logoConfig && typeof logoConfig === 'string') {
      setLogoPreview(logoConfig);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Prepare profile data with proper null handling for date fields
      const profileData = {
        ...profile,
        data_abertura: profile.data_abertura && profile.data_abertura.trim() !== '' ? profile.data_abertura : null
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id, // Include ID for proper update
          user_id: user.id,
          ...profileData
        });

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso"
      });
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error?.message || "Tente novamente em alguns instantes",
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
    if (!logoFile || !user) return;

    setIsLoading(true);
    try {
      // 1. Fazer upload para o Supabase Storage
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('logos-empresas')
        .upload(fileName, logoFile, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // 2. Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos-empresas')
        .getPublicUrl(fileName);
      
      // 3. Atualizar profile com a URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ logo_empresa_url: publicUrl })
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;
      
      // Atualizar estado local
      setProfile(prev => ({ ...prev, logo_empresa_url: publicUrl }));
      setLogoPreview(publicUrl);
      
      toast({
        title: "Logo atualizado",
        description: "Seu logo foi salvo com sucesso"
      });
    } catch (error) {
      console.error('Erro ao salvar logo:', error);
      toast({
        title: "Erro ao salvar logo",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const buscarEnderecoPorCEP = async (cep: string) => {
    if (!cep || cep.replace(/\D/g, '').length !== 8) return;
    
    setIsLoadingCEP(true);
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado",
          variant: "destructive"
        });
        return;
      }
      
      setProfile(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
        complemento: data.complemento || ''
      }));
      
      toast({
        title: "Endereço encontrado",
        description: "Dados preenchidos automaticamente. Preencha o número."
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Tente novamente em alguns instantes",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCEP(false);
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
            Cadastre as informações completas da sua empresa
          </p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Seção: Logo da Empresa */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Logo da Empresa
          </h2>
          
          <Card className="card-premium max-w-md mx-auto">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-40 h-40 bg-muted/30 rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden hover:border-primary/50 transition-all duration-300 group relative">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-10 w-10 text-muted-foreground mb-3 mx-auto group-hover:text-primary transition-colors duration-300" />
                      <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
                        Adicionar Logo
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    variant="outline"
                    className="w-full border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Escolher Imagem
                  </Button>
                  
                  {logoFile && (
                    <Button
                      onClick={saveLogo}
                      disabled={isLoading}
                      className="w-full button-premium"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? 'Salvando...' : 'Salvar Logo'}
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Formatos aceitos: JPG, PNG, GIF (máx. 2MB)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Dados da Empresa */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" />
            Dados da Empresa
          </h2>
          
          <Card className="card-premium">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome_fantasia">Nome Fantasia *</Label>
                  <Input
                    id="nome_fantasia"
                    value={profile.nome_fantasia}
                    onChange={(e) => setProfile(prev => ({ ...prev, nome_fantasia: e.target.value }))}
                    placeholder="Nome do seu negócio"
                    className="input-premium"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="razao_social">Razão Social</Label>
                  <Input
                    id="razao_social"
                    value={profile.razao_social}
                    onChange={(e) => setProfile(prev => ({ ...prev, razao_social: e.target.value }))}
                    placeholder="Razão social da empresa"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj_cpf">CNPJ / CPF *</Label>
                  <Input
                    id="cnpj_cpf"
                    value={profile.cnpj_cpf}
                    onChange={(e) => {
                      const formatted = formatCNPJCPF(e.target.value);
                      setProfile(prev => ({ ...prev, cnpj_cpf: formatted }));
                    }}
                    placeholder="00.000.000/0000-00 ou 000.000.000-00"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Tipo de Negócio</Label>
                  <select
                    id="business_type"
                    value={profile.business_type}
                    onChange={(e) => setProfile(prev => ({ ...prev, business_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background input-premium"
                  >
                    <option value="food">Alimentação</option>
                    <option value="retail">Varejo</option>
                    <option value="service">Serviços</option>
                    <option value="manufacturing">Indústria</option>
                    <option value="consulting">Consultoria</option>
                    <option value="technology">Tecnologia</option>
                    <option value="health">Saúde</option>
                    <option value="education">Educação</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Endereço */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            Endereço
          </h2>
          
          <Card className="card-premium">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cep"
                      value={profile.cep}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value);
                        setProfile(prev => ({ ...prev, cep: formatted }));
                      }}
                      placeholder="00000-000"
                      className="input-premium"
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      onClick={() => buscarEnderecoPorCEP(profile.cep)}
                      disabled={isLoadingCEP || !profile.cep}
                      variant="outline"
                      size="icon"
                      className="border-primary/20 hover:border-primary/50 hover:bg-primary/5 shrink-0"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Digite o CEP e clique na lupa
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={profile.estado}
                    onChange={(e) => setProfile(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                    placeholder="SP"
                    className="input-premium"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    value={profile.logradouro}
                    onChange={(e) => setProfile(prev => ({ ...prev, logradouro: e.target.value }))}
                    placeholder="Rua, Avenida, etc."
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <div className="flex gap-2">
                    <Input
                      id="numero"
                      value={semNumero ? 'S/N' : profile.numero}
                      onChange={(e) => !semNumero && setProfile(prev => ({ ...prev, numero: e.target.value }))}
                      placeholder="123"
                      className="input-premium"
                      disabled={semNumero}
                    />
                    <Button
                      type="button"
                      variant={semNumero ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSemNumero(!semNumero);
                        if (!semNumero) {
                          setProfile(prev => ({ ...prev, numero: 'S/N' }));
                        } else {
                          setProfile(prev => ({ ...prev, numero: '' }));
                        }
                      }}
                      className="whitespace-nowrap text-xs px-2"
                    >
                      S/N
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={profile.complemento}
                    onChange={(e) => setProfile(prev => ({ ...prev, complemento: e.target.value }))}
                    placeholder="Sala, Andar, etc."
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={profile.bairro}
                    onChange={(e) => setProfile(prev => ({ ...prev, bairro: e.target.value }))}
                    placeholder="Nome do bairro"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={profile.cidade}
                    onChange={(e) => setProfile(prev => ({ ...prev, cidade: e.target.value }))}
                    placeholder="Nome da cidade"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pais">País</Label>
                  <Input
                    id="pais"
                    value={profile.pais}
                    onChange={(e) => setProfile(prev => ({ ...prev, pais: e.target.value }))}
                    className="input-premium"
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Contatos e Configurações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Contatos */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Contatos
            </h2>
            
            <Card className="card-premium">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="telefone_comercial">Telefone Comercial</Label>
                  <Input
                    id="telefone_comercial"
                    value={profile.telefone_comercial}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setProfile(prev => ({ ...prev, telefone_comercial: formatted }));
                    }}
                    placeholder="(11) 3000-0000"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular">Celular</Label>
                  <Input
                    id="celular"
                    value={profile.celular}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setProfile(prev => ({ ...prev, celular: formatted }));
                    }}
                    placeholder="(11) 99999-9999"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_comercial">Email Comercial</Label>
                  <Input
                    id="email_comercial"
                    type="email"
                    value={profile.email_comercial}
                    onChange={(e) => setProfile(prev => ({ ...prev, email_comercial: e.target.value }))}
                    placeholder="contato@empresa.com"
                    className="input-premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={profile.instagram}
                    onChange={(e) => setProfile(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@seuinstagram"
                    className="input-premium"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configurações de Aparência */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple" />
              Aparência do Sistema
            </h2>
            
            <Card className="card-premium">
              <CardContent className="p-6 space-y-8">
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

        {/* Botão de Ação */}
        <div className="flex justify-center pt-8 border-t border-border/20">
          <Button 
            onClick={handleProfileUpdate}
            disabled={isLoading}
            className="button-premium px-12 py-3"
            size="lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Todas as Informações'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PerfilNegocio;