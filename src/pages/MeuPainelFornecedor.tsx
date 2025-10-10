import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Package, 
  DollarSign, 
  Star, 
  MessageCircle,
  Plus,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FornecedorData {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  eh_fornecedor: boolean;
}

interface Promocao {
  id: string;
  titulo: string;
  descricao: string;
  desconto_percentual: number | null;
  desconto_fixo: number | null;
  data_inicio: string;
  data_fim: string;
  ativa: boolean;
  usos_realizados: number;
  max_uso: number | null;
}

interface Orcamento {
  id: string;
  produtos_solicitados: any;
  mensagem: string;
  status: string;
  created_at: string;
  cliente_user_id: string;
}

export default function MeuPainelFornecedor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fornecedorData, setFornecedorData] = useState<FornecedorData | null>(null);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Buscar dados do fornecedor
      const { data: fornecedorData, error: fornecedorError } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('user_id', user!.id)
        .eq('eh_fornecedor', true)
        .single();

      if (fornecedorError) {
        // Fornecedor não existe ainda
        setFornecedorData(null);
        setLoading(false);
        return;
      }

      setFornecedorData(fornecedorData);

      // Buscar promoções
      const { data: promocoesData } = await supabase
        .from('promocoes_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorData.id)
        .order('created_at', { ascending: false });

      setPromocoes(promocoesData || []);

      // Buscar orçamentos
      const { data: orcamentosData } = await supabase
        .from('orcamentos_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorData.id)
        .order('created_at', { ascending: false });

      setOrcamentos(orcamentosData || []);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar painel');
    } finally {
      setLoading(false);
    }
  };

  const ativarFornecedor = async () => {
    try {
      // Buscar fornecedor existente
      const { data: existingFornecedor } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (existingFornecedor) {
        // Atualizar para ser fornecedor
        const { error } = await supabase
          .from('fornecedores')
          .update({ eh_fornecedor: true })
          .eq('id', existingFornecedor.id);

        if (error) throw error;
      } else {
        // Criar novo fornecedor
        const { error } = await supabase
          .from('fornecedores')
          .insert({
            user_id: user!.id,
            nome: user!.email?.split('@')[0] || 'Meu Negócio',
            eh_fornecedor: true
          });

        if (error) throw error;
      }

      toast.success('Fornecedor ativado! Configure seu perfil em Estoque > Fornecedores');
      fetchData();
    } catch (error) {
      console.error('Erro ao ativar fornecedor:', error);
      toast.error('Erro ao ativar fornecedor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!fornecedorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-6 py-8">
          <Card className="soft-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">
                <Store className="inline h-6 w-6 mr-2" />
                Seja um Fornecedor
              </CardTitle>
              <CardDescription>
                Cadastre-se como fornecedor e apareça no marketplace para milhares de clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Divulgue seus produtos</h3>
                    <p className="text-sm text-muted-foreground">
                      Mostre seus produtos para clientes da sua região
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Crie promoções</h3>
                    <p className="text-sm text-muted-foreground">
                      Atraia clientes com ofertas especiais
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Receba orçamentos</h3>
                    <p className="text-sm text-muted-foreground">
                      Clientes podem solicitar orçamentos direto com você
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={ativarFornecedor} size="lg" className="w-full">
                Ativar Perfil de Fornecedor
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Após ativar, configure seu perfil completo em Estoque {'>'} Fornecedores
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const orcamentosPendentes = orcamentos.filter(o => o.status === 'pendente').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            <Store className="inline h-8 w-8 mr-2" />
            Painel de Fornecedor
          </h1>
          <p className="text-muted-foreground text-lg">
            Gerencie suas promoções e orçamentos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="soft-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orçamentos</p>
                  <p className="text-3xl font-bold">{orcamentosPendentes}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
                </div>
                <MessageCircle className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Promoções</p>
                  <p className="text-3xl font-bold">
                    {promocoes.filter(p => p.ativa).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ativas</p>
                </div>
                <DollarSign className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avaliação</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                    <p className="text-3xl font-bold">4.5</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Média geral</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="promocoes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="promocoes">Promoções</TabsTrigger>
            <TabsTrigger value="orcamentos">
              Orçamentos
              {orcamentosPendentes > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {orcamentosPendentes}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="promocoes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Minhas Promoções</h2>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Promoção
              </Button>
            </div>

            {promocoes.length === 0 ? (
              <Card className="soft-card">
                <CardContent className="p-12 text-center">
                  <DollarSign className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">
                    Você ainda não criou nenhuma promoção
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {promocoes.map((promo) => (
                  <Card key={promo.id} className="soft-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{promo.titulo}</CardTitle>
                        <Badge variant={promo.ativa ? "default" : "secondary"}>
                          {promo.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <CardDescription>{promo.descricao}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Desconto:</span>
                        <span className="font-medium">
                          {promo.desconto_percentual 
                            ? `${promo.desconto_percentual}%` 
                            : `R$ ${promo.desconto_fixo}`
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Usos:</span>
                        <span className="font-medium">
                          {promo.usos_realizados}
                          {promo.max_uso && ` / ${promo.max_uso}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Válida até:</span>
                        <span className="font-medium">
                          {new Date(promo.data_fim).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orcamentos" className="space-y-4">
            <h2 className="text-xl font-semibold">Orçamentos Recebidos</h2>

            {orcamentos.length === 0 ? (
              <Card className="soft-card">
                <CardContent className="p-12 text-center">
                  <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">
                    Você ainda não recebeu nenhum orçamento
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orcamentos.map((orc) => (
                  <Card key={orc.id} className="soft-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            Orçamento #{orc.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            {new Date(orc.created_at).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={
                            orc.status === 'pendente' ? 'secondary' : 
                            orc.status === 'respondido' ? 'default' : 
                            'outline'
                          }
                        >
                          {orc.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {orc.mensagem && (
                        <p className="text-sm text-muted-foreground">
                          {orc.mensagem}
                        </p>
                      )}
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card className="soft-card">
              <CardHeader>
                <CardTitle>
                  <Settings className="inline h-5 w-5 mr-2" />
                  Configurações do Fornecedor
                </CardTitle>
                <CardDescription>
                  Configure seu perfil completo em Estoque {'>'} Fornecedores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/estoque')}>
                  Ir para Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}