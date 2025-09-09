import { useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Embalagem {
  id: string;
  produto_id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  custo_total: number;
}

export function EmbalagensStep() {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data de embalagens disponíveis
  const embalagensDisponiveis = [
    { id: '1', nome: 'Caixa de Papelão 20x20cm', unidade: 'un', custo_unitario: 2.50 },
    { id: '2', nome: 'Saco Plástico Transparente', unidade: 'un', custo_unitario: 0.15 },
    { id: '3', nome: 'Etiqueta Adesiva', unidade: 'un', custo_unitario: 0.10 },
    { id: '4', nome: 'Bandeja de Papel', unidade: 'un', custo_unitario: 0.80 },
    { id: '5', nome: 'Papel Manteiga', unidade: 'folha', custo_unitario: 0.05 },
    { id: '6', nome: 'Fita Adesiva', unidade: 'm', custo_unitario: 0.20 },
  ];

  const adicionarEmbalagem = (produto: any) => {
    const novaEmbalagem: Embalagem = {
      id: Date.now().toString(),
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: 1,
      unidade: produto.unidade,
      custo_unitario: produto.custo_unitario,
      custo_total: produto.custo_unitario,
    };
    
    setEmbalagens([...embalagens, novaEmbalagem]);
  };

  const removerEmbalagem = (id: string) => {
    setEmbalagens(embalagens.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    setEmbalagens(embalagens.map(item => 
      item.id === id 
        ? { ...item, quantidade, custo_total: quantidade * item.custo_unitario }
        : item
    ));
  };

  const custoTotalEmbalagens = embalagens.reduce((total, item) => total + item.custo_total, 0);
  
  const embalagensFiltradas = embalagensDisponiveis.filter(embalagem =>
    embalagem.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Adicionar Embalagens</h3>
        <p className="text-muted-foreground">Selecione as embalagens necessárias para esta receita</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Embalagens Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Embalagens Disponíveis</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar embalagens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {embalagensFiltradas.map((embalagem) => (
              <div key={embalagem.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div>
                  <p className="font-medium">{embalagem.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    R$ {embalagem.custo_unitario.toFixed(2)} / {embalagem.unidade}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => adicionarEmbalagem(embalagem)}
                  disabled={embalagens.some(item => item.produto_id === embalagem.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Embalagens Selecionadas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Embalagens da Receita</CardTitle>
              <Badge variant="secondary">
                Total: R$ {custoTotalEmbalagens.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {embalagens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma embalagem adicionada</p>
                <p className="text-sm">Selecione embalagens da lista ao lado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Embalagem</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {embalagens.map((embalagem) => (
                    <TableRow key={embalagem.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{embalagem.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {embalagem.custo_unitario.toFixed(2)} / {embalagem.unidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={embalagem.quantidade}
                          onChange={(e) => atualizarQuantidade(embalagem.id, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">R$ {embalagem.custo_total.toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerEmbalagem(embalagem.id)}
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