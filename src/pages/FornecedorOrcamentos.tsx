import { useEffect, useState } from 'react';
import { MessageCircle, Calendar, User, Package, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function FornecedorOrcamentos() {
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      const { data: fornecedorData } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!fornecedorData) return;

      const { data, error } = await supabase
        .from('orcamentos_fornecedores')
        .select('*')
        .eq('fornecedor_id', fornecedorData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar orçamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pendente: 'outline',
      respondido: 'default',
      aprovado: 'default',
      recusado: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-primary rounded-xl shadow-glow">
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie as solicitações dos clientes</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orcamentos.filter(o => o.status === 'pendente').length}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orcamentos.filter(o => o.status === 'respondido').length}</div>
            <p className="text-sm text-muted-foreground">Respondidos</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orcamentos.filter(o => o.status === 'aprovado').length}</div>
            <p className="text-sm text-muted-foreground">Aprovados</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{orcamentos.length}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Orcamentos List */}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Solicitações Recebidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orcamentos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum orçamento recebido ainda</p>
              </div>
            ) : (
              orcamentos.map((orcamento) => (
                <div key={orcamento.id} className="p-4 glass-panel rounded-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{orcamento.cliente_user_id}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(orcamento.status)}
                  </div>

                  {orcamento.mensagem && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">{orcamento.mensagem}</p>
                    </div>
                  )}

                  {orcamento.produtos_solicitados && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{Array.isArray(orcamento.produtos_solicitados) ? orcamento.produtos_solicitados.length : 0} produtos solicitados</span>
                    </div>
                  )}

                  {orcamento.whatsapp_link && (
                    <a
                      href={orcamento.whatsapp_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      Contatar via WhatsApp
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
