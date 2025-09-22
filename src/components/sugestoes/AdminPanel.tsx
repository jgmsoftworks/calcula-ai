import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Settings, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: string;
  urgency: string;
  status: string;
  allow_contact: boolean;
  plan?: string;
  created_at: string;
  user_id: string;
}

export const AdminPanel = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAdmin } = useAuth();

  const statusLabels = {
    new: "Nova",
    review: "Em Análise", 
    in_progress: "Em Progresso",
    released: "Implementada",
    rejected: "Rejeitada"
  };

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    review: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-orange-100 text-orange-800", 
    released: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };

  const categoryLabels = {
    bug: "Bug",
    improvement: "Melhoria",
    feature: "Novo Recurso"
  };

  const levelLabels = {
    low: "Baixo",
    medium: "Médio", 
    high: "Alto"
  };

  const fetchSuggestions = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar sugestões:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar sugestões",
          variant: "destructive",
        });
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ status: newStatus })
        .eq('id', suggestionId);

      if (error) {
        console.error("Erro ao atualizar status:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar status da sugestão",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });

      // Refresh the list
      fetchSuggestions();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const deleteSuggestion = async (suggestionId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta sugestão?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) {
        console.error("Erro ao excluir sugestão:", error);
        toast({
          title: "Erro",
          description: "Erro ao excluir sugestão",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Sugestão excluída com sucesso",
      });

      // Refresh the list
      fetchSuggestions();
    } catch (error) {
      console.error("Erro ao excluir sugestão:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSuggestions();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          Acesso negado. Apenas administradores podem ver este painel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Painel Administrativo - Sugestões
          </div>
          <Button 
            onClick={fetchSuggestions} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
        <CardDescription>
          Gerencie todas as sugestões recebidas pelos usuários
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando sugestões...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma sugestão encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div><strong>Total:</strong> {suggestions.length}</div>
              <div><strong>Novas:</strong> {suggestions.filter(s => s.status === 'new').length}</div>
              <div><strong>Em análise:</strong> {suggestions.filter(s => s.status === 'review').length}</div>
              <div><strong>Implementadas:</strong> {suggestions.filter(s => s.status === 'released').length}</div>
              <div><strong>Rejeitadas:</strong> {suggestions.filter(s => s.status === 'rejected').length}</div>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Impacto</TableHead>
                    <TableHead>Urgência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((suggestion) => (
                    <TableRow key={suggestion.id}>
                      <TableCell className="max-w-xs">
                        <div>
                          <p className="font-medium truncate">{suggestion.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {suggestion.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryLabels[suggestion.category as keyof typeof categoryLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {levelLabels[suggestion.impact as keyof typeof levelLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {levelLabels[suggestion.urgency as keyof typeof levelLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={suggestion.status}
                          onValueChange={(value) => updateSuggestionStatus(suggestion.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(suggestion.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Show full details in a modal or expand
                              alert(`Detalhes completos:\n\nTítulo: ${suggestion.title}\n\nDescrição: ${suggestion.description}\n\nPlano: ${suggestion.plan}\n\nPermite contato: ${suggestion.allow_contact ? 'Sim' : 'Não'}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSuggestion(suggestion.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};