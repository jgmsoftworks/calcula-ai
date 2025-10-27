import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ReceitasFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterTipo: 'todas' | 'normal' | 'sub_receita';
  onFilterTipoChange: (value: 'todas' | 'normal' | 'sub_receita') => void;
  filterStatus: 'todas' | 'finalizada' | 'rascunho';
  onFilterStatusChange: (value: 'todas' | 'finalizada' | 'rascunho') => void;
  filterTipoProduto: string;
  onFilterTipoProdutoChange: (value: string) => void;
  filterRendimento: 'todas' | 'com' | 'sem';
  onFilterRendimentoChange: (value: 'todas' | 'com' | 'sem') => void;
  sortBy: 'recente' | 'antiga' | 'a-z' | 'z-a' | 'maior-custo' | 'menor-custo' | 'numero-asc' | 'numero-desc';
  onSortByChange: (value: 'recente' | 'antiga' | 'a-z' | 'z-a' | 'maior-custo' | 'menor-custo' | 'numero-asc' | 'numero-desc') => void;
  tiposProduto: string[];
  totalReceitas: number;
  receitasFiltradas: number;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const ReceitasFilters = ({
  searchTerm,
  onSearchChange,
  filterTipo,
  onFilterTipoChange,
  filterStatus,
  onFilterStatusChange,
  filterTipoProduto,
  onFilterTipoProdutoChange,
  filterRendimento,
  onFilterRendimentoChange,
  sortBy,
  onSortByChange,
  tiposProduto,
  totalReceitas,
  receitasFiltradas,
  onClearFilters,
  hasActiveFilters,
}: ReceitasFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar receita por nome..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>

        <Select value={filterTipo} onValueChange={onFilterTipoChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de receita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="normal">Receitas Normais</SelectItem>
            <SelectItem value="sub_receita">Sub-receitas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os Status</SelectItem>
            <SelectItem value="finalizada">Finalizadas</SelectItem>
            <SelectItem value="rascunho">Rascunhos</SelectItem>
          </SelectContent>
        </Select>

        {tiposProduto.length > 0 && (
          <Select value={filterTipoProduto} onValueChange={onFilterTipoProdutoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Produtos</SelectItem>
              {tiposProduto.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterRendimento} onValueChange={onFilterRendimentoChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Rendimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os Rendimentos</SelectItem>
            <SelectItem value="com">Com Rendimento</SelectItem>
            <SelectItem value="sem">Sem Rendimento</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="numero-asc">Por Número (Crescente)</SelectItem>
            <SelectItem value="numero-desc">Por Número (Decrescente)</SelectItem>
            <SelectItem value="recente">Mais Recentes</SelectItem>
            <SelectItem value="antiga">Mais Antigas</SelectItem>
            <SelectItem value="a-z">A-Z</SelectItem>
            <SelectItem value="z-a">Z-A</SelectItem>
            <SelectItem value="maior-custo">Maior Custo</SelectItem>
            <SelectItem value="menor-custo">Menor Custo</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Contador de resultados */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-sm">
          Mostrando {receitasFiltradas} de {totalReceitas} receitas
        </Badge>
        {hasActiveFilters && (
          <span className="text-sm text-muted-foreground">
            (filtros ativos)
          </span>
        )}
      </div>
    </div>
  );
};
