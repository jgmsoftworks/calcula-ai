import { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SubReceita {
  id: string;
  receita_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

interface SubReceitasStepProps {
  receitaId: string;
  subReceitas: SubReceita[];
  onSubReceitasChange: (subReceitas: SubReceita[]) => void;
}

export function SubReceitasStep({ receitaId, subReceitas, onSubReceitasChange }: SubReceitasStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data de receitas disponíveis
  const receitasDisponiveis = [
    { id: '1', nome: 'Cobertura de Chocolate', unidade: 'porção', custo_unitario: 8.50 },
    { id: '2', nome: 'Massa Base de Bolo', unidade: 'porção', custo_unitario: 12.00 },
    { id: '3', nome: 'Recheio de Doce de Leite', unidade: 'porção', custo_unitario: 6.75 },
    { id: '4', nome: 'Calda de Açúcar', unidade: 'porção', custo_unitario: 3.20 },
  ];

  const adicionarSubReceita = (receita: any) => {
    const novaSubReceita: SubReceita = {
      id: Date.now().toString(),
      receita_id: receita.id,
      nome: receita.nome,
      quantidade: 1,
      unidade: receita.unidade,
      custo_unitario: receita.custo_unitario,
      custo_total: receita.custo_unitario,
    };
    
    onSubReceitasChange([...subReceitas, novaSubReceita]);
  };

  const removerSubReceita = (id: string) => {
    onSubReceitasChange(subReceitas.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    const updatedSubReceitas = subReceitas.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    );
    onSubReceitasChange(updatedSubReceitas);
  };

  const custoTotalSubReceitas = subReceitas.reduce((total, item) => total + item.custo_total, 0);
  
  const receitasFiltradas = receitasDisponiveis.filter(receita =>
    receita.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adicionar Sub-receitas</h3>
        <p className="text-muted-foreground">Selecione as receitas que fazem parte desta receita principal (opcional)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Receitas Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receitas Disponíveis</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar receitas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {receitasFiltradas.map((receita) => (
              <div key={receita.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div>
                  <p className="font-medium">{receita.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {receita.custo_unitario.toFixed(2)} / {receita.unidade}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => adicionarSubReceita(receita)}
                  disabled={subReceitas.some(item => item.receita_id === receita.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {receitasFiltradas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma receita encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sub-receitas Selecionadas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Sub-receitas Adicionadas</CardTitle>
              <Badge variant="secondary">
                Total: R$ {custoTotalSubReceitas.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {subReceitas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma sub-receita adicionada</p>
                <p className="text-sm">Esta etapa é opcional</p>
                <p className="text-sm">Selecione receitas da lista ao lado se necessário</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receita</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subReceitas.map((subReceita) => (
                    <TableRow key={subReceita.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{subReceita.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {subReceita.custo_unitario.toFixed(2)} / {subReceita.unidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={subReceita.quantidade}
                          onChange={(e) => atualizarQuantidade(subReceita.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">R$ {subReceita.custo_total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerSubReceita(subReceita.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}