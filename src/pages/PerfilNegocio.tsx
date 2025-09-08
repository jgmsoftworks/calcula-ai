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
  FileText
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
  
  // Dados da empresa
  cnpj_cpf?: string;
  razao_social?: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  
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
  whatsapp?: string;
  email_comercial?: string;
  website?: string;
  
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
  const { saveConfiguration, loadConfiguration } = useUserConfigurations();
  
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    business_name: '',
    business_type: 'food',
    cnpj_cpf: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
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
    whatsapp: '',
    email_comercial: '',
    website: '',
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
          business_type: data.business_type || 'food',
          cnpj_cpf: data.cnpj_cpf || '',
          razao_social: data.razao_social || '',
          nome_fantasia: data.nome_fantasia || '',
          inscricao_estadual: data.inscricao_estadual || '',
          inscricao_municipal: data.inscricao_municipal || '',
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
          whatsapp: data.whatsapp || '',
          email_comercial: data.email_comercial || '',
          website: data.website || '',
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
          ...profile
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
            Cadastre as informações completas da sua empresa
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
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
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Digite seu nome completo"
                className="input-premium"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted input-premium opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Email não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone Pessoal</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_cpf">CPF do Responsável</Label>
              <Input
                id="responsavel_cpf"
                value={profile.responsavel_cpf}
                onChange={(e) => setProfile(prev => ({ ...prev, responsavel_cpf: e.target.value }))}
                placeholder="000.000.000-00"
                className="input-premium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados da Empresa */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-secondary" />
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                Dados da Empresa
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nome Fantasia *</Label>
              <Input
                id="business_name"
                value={profile.business_name}
                onChange={(e) => setProfile(prev => ({ ...prev, business_name: e.target.value }))}
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
                onChange={(e) => setProfile(prev => ({ ...prev, cnpj_cpf: e.target.value }))}
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                className="input-premium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inscricao_estadual">Insc. Estadual</Label>
                <Input
                  id="inscricao_estadual"
                  value={profile.inscricao_estadual}
                  onChange={(e) => setProfile(prev => ({ ...prev, inscricao_estadual: e.target.value }))}
                  placeholder="000.000.000.000"
                  className="input-premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inscricao_municipal">Insc. Municipal</Label>
                <Input
                  id="inscricao_municipal"
                  value={profile.inscricao_municipal}
                  onChange={(e) => setProfile(prev => ({ ...prev, inscricao_municipal: e.target.value }))}
                  placeholder="000000000"
                  className="input-premium"
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="regime_tributario">Regime Tributário</Label>
              <select
                id="regime_tributario"
                value={profile.regime_tributario}
                onChange={(e) => setProfile(prev => ({ ...prev, regime_tributario: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background input-premium"
              >
                <option value="">Selecione...</option>
                <option value="mei">MEI</option>
                <option value="simples_nacional">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porte_empresa">Porte da Empresa</Label>
              <select
                id="porte_empresa"
                value={profile.porte_empresa}
                onChange={(e) => setProfile(prev => ({ ...prev, porte_empresa: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background input-premium"
              >
                <option value="">Selecione...</option>
                <option value="mei">MEI</option>
                <option value="micro">Microempresa</option>
                <option value="pequena">Pequena Empresa</option>
                <option value="media">Média Empresa</option>
                <option value="grande">Grande Empresa</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_abertura">Data de Abertura</Label>
              <Input
                id="data_abertura"
                type="date"
                value={profile.data_abertura}
                onChange={(e) => setProfile(prev => ({ ...prev, data_abertura: e.target.value }))}
                className="input-premium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Endereço
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={profile.cep}
                  onChange={(e) => setProfile(prev => ({ ...prev, cep: e.target.value }))}
                  placeholder="00000-000"
                  className="input-premium"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={profile.estado}
                  onChange={(e) => setProfile(prev => ({ ...prev, estado: e.target.value }))}
                  placeholder="SP"
                  className="input-premium"
                  maxLength={2}
                />
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={profile.numero}
                  onChange={(e) => setProfile(prev => ({ ...prev, numero: e.target.value }))}
                  placeholder="123"
                  className="input-premium"
                />
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
          </CardContent>
        </Card>

        {/* Contatos */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Contatos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="telefone_comercial">Telefone Comercial</Label>
              <Input
                id="telefone_comercial"
                value={profile.telefone_comercial}
                onChange={(e) => setProfile(prev => ({ ...prev, telefone_comercial: e.target.value }))}
                placeholder="(11) 3000-0000"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                value={profile.celular}
                onChange={(e) => setProfile(prev => ({ ...prev, celular: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={profile.whatsapp}
                onChange={(e) => setProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
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
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://www.empresa.com"
                className="input-premium"
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="card-premium">
          <CardHeader className="bg-gradient-to-r from-card/50 to-card border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                Informações Adicionais
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="setor_atividade">Setor de Atividade</Label>
              <Input
                id="setor_atividade"
                value={profile.setor_atividade}
                onChange={(e) => setProfile(prev => ({ ...prev, setor_atividade: e.target.value }))}
                placeholder="Ex: Alimentação, Varejo, Tecnologia"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_empresa">Descrição da Empresa</Label>
              <textarea
                id="descricao_empresa"
                value={profile.descricao_empresa}
                onChange={(e) => setProfile(prev => ({ ...prev, descricao_empresa: e.target.value }))}
                placeholder="Descreva brevemente sua empresa e atividades"
                className="w-full px-3 py-2 border border-border rounded-md bg-background input-premium min-h-[100px] resize-none"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_nome">Nome do Responsável</Label>
              <Input
                id="responsavel_nome"
                value={profile.responsavel_nome}
                onChange={(e) => setProfile(prev => ({ ...prev, responsavel_nome: e.target.value }))}
                placeholder="Nome completo do responsável"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_cargo">Cargo do Responsável</Label>
              <Input
                id="responsavel_cargo"
                value={profile.responsavel_cargo}
                onChange={(e) => setProfile(prev => ({ ...prev, responsavel_cargo: e.target.value }))}
                placeholder="Ex: Diretor, Gerente, Proprietário"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_email">Email do Responsável</Label>
              <Input
                id="responsavel_email"
                type="email"
                value={profile.responsavel_email}
                onChange={(e) => setProfile(prev => ({ ...prev, responsavel_email: e.target.value }))}
                placeholder="email@responsavel.com"
                className="input-premium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_telefone">Telefone do Responsável</Label>
              <Input
                id="responsavel_telefone"
                value={profile.responsavel_telefone}
                onChange={(e) => setProfile(prev => ({ ...prev, responsavel_telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="input-premium"
              />
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

      {/* Botões de Ação */}
      <div className="flex justify-center pt-6">
        <div className="flex gap-4">
          <Button 
            onClick={handleProfileUpdate}
            disabled={isLoading}
            className="button-premium px-8 py-3"
            variant="gradient"
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