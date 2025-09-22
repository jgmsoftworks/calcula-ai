import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoadmap, RoadmapStatus, RoadmapSort } from "@/hooks/useRoadmap";
import { Heart, Clock, CheckCircle, PlayCircle, Filter, SortDesc, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const RoadmapList = () => {
  const { 
    roadmapItems, 
    loading, 
    statusFilter, 
    sortBy, 
    setStatusFilter, 
    setSortBy, 
    toggleVote 
  } = useRoadmap();

  const statusLabels = {
    all: "Todos",
    planned: "Planejado",
    in_progress: "Em Progresso", 
    released: "Lançado"
  };

  const statusIcons = {
    planned: Clock,
    in_progress: PlayCircle,
    released: CheckCircle
  };

  const statusColors = {
    planned: "bg-blue-100 text-blue-800 border-blue-200",
    in_progress: "bg-yellow-100 text-yellow-800 border-yellow-200",
    released: "bg-green-100 text-green-800 border-green-200"
  };

  const sortLabels = {
    votes: "Mais Votados",
    date: "Mais Recentes"
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(value: RoadmapStatus) => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
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

              <Select value={sortBy} onValueChange={(value: RoadmapSort) => setSortBy(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
              <SortDesc className="h-4 w-4" />
              {roadmapItems.length} {roadmapItems.length === 1 ? "item" : "itens"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Items */}
      <div className="space-y-4">
        {roadmapItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum item encontrado</h3>
              <p className="text-muted-foreground">
                {statusFilter === "all" 
                  ? "Não há itens no roadmap no momento."
                  : `Não há itens com status "${statusLabels[statusFilter]}".`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          roadmapItems.map((item) => {
            const StatusIcon = statusIcons[item.status];
            
            return (
              <Card key={item.id} className="relative">
                {item.is_new && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge variant="secondary" className="bg-primary text-primary-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Novo
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${statusColors[item.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusLabels[item.status]}
                        </Badge>
                        
                        {item.eta && (
                          <span className="text-sm text-muted-foreground">
                            ETA: {item.eta}
                          </span>
                        )}
                        
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "MMM yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      variant={item.user_voted ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleVote(item.id)}
                      className="flex items-center gap-2 min-w-[80px]"
                    >
                      <Heart 
                        className={`h-4 w-4 ${item.user_voted ? 'fill-current' : ''}`} 
                      />
                      {item.vote_count}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <CardDescription className="text-base leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Load more placeholder for future pagination */}
      {roadmapItems.length >= 10 && (
        <div className="text-center pt-4">
          <Button variant="outline" disabled>
            Carregar mais itens
          </Button>
        </div>
      )}
    </div>
  );
};