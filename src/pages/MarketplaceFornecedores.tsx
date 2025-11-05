import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Star, Phone, MessageCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import SolicitarOrcamentoModal from '@/components/marketplace/SolicitarOrcamentoModal';

interface Fornecedor {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  descricao: string;
  logo_url: string;
  telefone: string;
  email: string;
  rating: number;
  formas_pagamento: string[];
  entrega_disponivel: boolean;
}

interface Promocao {
  id: string;
  titulo: string;
  descricao: string;
  desconto_percentual: number | null;
  desconto_fixo: number | null;
  fornecedor: Fornecedor;
  data_fim: string;
}

export default function MarketplaceFornecedores() {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [cidades, setCidades] = useState<string[]>([]);
  const [orcamentoModal, setOrcamentoModal] = useState<{ open: boolean; fornecedor: Fornecedor | null }>({
    open: false,
    fornecedor: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar fornecedores
      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('eh_fornecedor', true)
        .eq('ativo', true);

      if (fornecedoresError) throw fornecedoresError;

      // Buscar promoções ativas
      const { data: promocoesData, error: promocoesError } = await supabase
        .from('promocoes_fornecedores')
        .select(`
          *,
          fornecedor:fornecedores(*)
        `)
        .eq('ativa', true)
        .gte('data_fim', new Date().toISOString())
        .limit(6);

      if (promocoesError) throw promocoesError;

      // Buscar avaliações para cada fornecedor
      const fornecedoresComRating = await Promise.all(
        (fornecedoresData || []).map(async (fornecedor) => {
          const { data: ratingData } = await supabase.rpc('get_fornecedor_rating', {
            fornecedor_uuid: fornecedor.id
          });
          
          return {
            ...fornecedor,
            rating: ratingData || 0
          };
        })
      );

      setFornecedores(fornecedoresComRating);
      setPromocoes(promocoesData as any || []);

      // Extrair cidades únicas
      const cidadesUnicas = [...new Set(fornecedoresComRating
        .map(f => f.cidade)
        .filter(Boolean)
      )] as string[];
      setCidades(cidadesUnicas);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar marketplace');
    } finally {
      setLoading(false);
    }
  };

  const solicitarOrcamento = (fornecedor: Fornecedor) => {
    if (!user) {
      toast.error('Faça login para solicitar orçamentos');
      return;
    }

    setOrcamentoModal({ open: true, fornecedor });
  };

  const contatarWhatsApp = (telefone: string, nome: string) => {
    const mensagem = encodeURIComponent(
      `Olá ${nome}! Vi seu perfil no CalculaAI e gostaria de conhecer mais sobre seus produtos.`
    );
    window.open(`https://wa.me/55${telefone.replace(/\D/g, '')}?text=${mensagem}`, '_blank');
  };

  const fornecedoresFiltrados = fornecedores.filter(f => {
    const matchSearch = !searchTerm || 
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCidade = !cidadeFiltro || cidadeFiltro === 'all' || f.cidade === cidadeFiltro;

    return matchSearch && matchCidade;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            🏪 Marketplace de Fornecedores
          </h1>
          <p className="text-muted-foreground text-lg">
            Encontre fornecedores próximos a você e aproveite promoções exclusivas
          </p>
        </div>

        {/* Filtros */}
        <Card className="soft-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fornecedores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={cidadeFiltro} onValueChange={setCidadeFiltro}>
                <SelectTrigger className="w-full md:w-64">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {cidades.map((cidade) => (
                    <SelectItem key={cidade} value={cidade}>
                      {cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Promoções em Destaque */}
        {promocoes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">🎉 Promoções Ativas</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promocoes.map((promo) => (
                <Card key={promo.id} className="soft-card border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{promo.titulo}</CardTitle>
                      <Badge variant="destructive" className="font-bold">
                        {promo.desconto_percentual 
                          ? `-${promo.desconto_percentual}%` 
                          : `-R$ ${promo.desconto_fixo}`
                        }
                      </Badge>
                    </div>
                    <CardDescription>{promo.descricao}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{promo.fornecedor.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {promo.fornecedor.cidade}, {promo.fornecedor.estado}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Válido até {new Date(promo.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Fornecedores */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              📦 Fornecedores ({fornecedoresFiltrados.length})
            </h2>
          </div>

          {fornecedoresFiltrados.length === 0 ? (
            <Card className="soft-card">
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">
                  Nenhum fornecedor encontrado com os filtros aplicados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fornecedoresFiltrados.map((fornecedor) => (
                <Card key={fornecedor.id} className="soft-card hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        {fornecedor.logo_url ? (
                          <img 
                            src={fornecedor.logo_url} 
                            alt={fornecedor.nome}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{fornecedor.nome}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            <span className="text-sm font-medium ml-1">
                              {fornecedor.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {fornecedor.descricao || 'Fornecedor de produtos de qualidade'}
                    </p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{fornecedor.cidade}, {fornecedor.estado}</span>
                      </div>
                      
                      {fornecedor.formas_pagamento && (
                        <div className="flex flex-wrap gap-1">
                          {fornecedor.formas_pagamento.slice(0, 3).map((forma) => (
                            <Badge key={forma} variant="outline" className="text-xs">
                              {forma}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => solicitarOrcamento(fornecedor)}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Orçamento
                      </Button>
                      <Button
                        onClick={() => contatarWhatsApp(fornecedor.telefone, fornecedor.nome)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {orcamentoModal.fornecedor && (
        <SolicitarOrcamentoModal
          open={orcamentoModal.open}
          onOpenChange={(open) => setOrcamentoModal({ open, fornecedor: null })}
          fornecedorId={orcamentoModal.fornecedor.id}
          fornecedorNome={orcamentoModal.fornecedor.nome}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}