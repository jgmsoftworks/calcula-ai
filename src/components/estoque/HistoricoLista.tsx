import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, History, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Movimentacao {
  id: string;
  data: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  observacao: string | null;
  produto: {
    nome: string;
    unidade: string;
  };
  fornecedor?: {
    nome: string;
  } | null;
  custo_unitario: number | null;
}

export const HistoricoLista = () => {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todas' | 'entrada' | 'saida'>('todas');
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    loadMovimentacoes();
  }, []);

  const loadMovimentacoes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('movimentacoes')
        .select(`
          *,
          produto:produtos(nome, unidade),
          fornecedor:fornecedores(nome)
        `)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMovimentacoes(data || []);
    } catch (error) {
      toast({
        title: "Erro ao carregar histórico",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovimentacoes = movimentacoes.filter(mov => {
    const matchesSearch = mov.produto?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.observacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.fornecedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = filterTipo === 'todas' || mov.tipo === filterTipo;
    
    return matchesSearch && matchesTipo;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const getTipoIcon = (tipo: string) => {
    return tipo === 'entrada' ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'entrada' ? (
      <Badge className="bg-green-100 text-green-800 border-green-200">
        Entrada
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 border-red-200">
        Saída
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Histórico de Movimentações</h2>
        <p className="text-muted-foreground">
          Consulte todas as movimentações de estoque
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <History className="w-5 h-5" />
            Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por produto, fornecedor ou observação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-primary/30 focus:border-primary"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo as any}>
              <SelectTrigger className="w-full sm:w-48 border-2 border-primary/30 focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="rounded-lg border border-primary/20 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead className="text-primary font-semibold">Data</TableHead>
                    <TableHead className="text-primary font-semibold">Produto</TableHead>
                    <TableHead className="text-primary font-semibold">Tipo</TableHead>
                    <TableHead className="text-primary font-semibold">Quantidade</TableHead>
                    <TableHead className="text-primary font-semibold">Custo Unit.</TableHead>
                    <TableHead className="text-primary font-semibold">Fornecedor</TableHead>
                    <TableHead className="text-primary font-semibold">Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimentacoes.map((mov) => (
                    <TableRow key={mov.id} className="hover:bg-primary/5">
                      <TableCell className="font-medium">
                        {formatDate(mov.data)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{mov.produto?.nome || 'Produto não encontrado'}</div>
                          <div className="text-xs text-muted-foreground">
                            Unidade: {mov.produto?.unidade || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTipoIcon(mov.tipo)}
                          {getTipoBadge(mov.tipo)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {mov.quantidade} {mov.produto?.unidade}
                      </TableCell>
                      <TableCell>
                        {mov.custo_unitario ? `R$ ${mov.custo_unitario.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {mov.fornecedor?.nome || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={mov.observacao || ''}>
                          {mov.observacao || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredMovimentacoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || filterTipo !== 'todas' 
                    ? 'Nenhuma movimentação encontrada com os filtros aplicados' 
                    : 'Nenhuma movimentação registrada'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};