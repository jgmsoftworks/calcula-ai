import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Download, Eye, Store, Package } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import type { ReceitaComDados } from '@/types/receitas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReceitaCardProps {
  receita: ReceitaComDados;
  onEdit: (receita: ReceitaComDados) => void;
  onDelete: () => void;
}

export function ReceitaCard({ receita, onEdit, onDelete }: ReceitaCardProps) {
  const { deleteReceita } = useReceitas();

  const handleDelete = async () => {
    const success = await deleteReceita(receita.id);
    if (success) onDelete();
  };

  const custoTotal = (receita.custo_ingredientes || 0) + 
                     (receita.custo_embalagens || 0) + 
                     (receita.custo_mao_obra || 0) + 
                     (receita.custo_sub_receitas || 0);

  const margem = receita.preco_venda - custoTotal;
  const margemPercentual = custoTotal > 0 ? (margem / receita.preco_venda) * 100 : 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-6">
          {/* Número sequencial */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-2xl font-bold">{receita.numero_sequencial}</span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {receita.tipo_produto?.nome && (
                    <Badge className="bg-purple-500 text-white">
                      {receita.tipo_produto.nome}
                    </Badge>
                  )}
                  {receita.markup?.tipo === 'sub_receita' && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Sub-receita
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-1">{receita.nome}</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Sub-receitas: {receita.total_sub_receitas || 0}</span>
                  <span>Rendimento: {receita.rendimento_valor || 0} {receita.rendimento_unidade || 'un'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={receita.status === 'finalizada' ? 'default' : 'secondary'}>
                  {receita.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                </Badge>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Preview">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(receita)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Vitrine">
                    <Store className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a receita "{receita.nome}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Grid de informações - 3 linhas */}
            <div className="space-y-3">
              {/* Linha 1 - Contadores */}
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Tempo Total</div>
                  <div className="font-semibold">{receita.tempo_preparo_total || 0} min</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Tempo M.O.</div>
                  <div className="font-semibold">{receita.tempo_preparo_mao_obra || 0} min</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Ingredientes</div>
                  <div className="font-semibold">{receita.total_ingredientes || 0}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Sub-receitas</div>
                  <div className="font-semibold">{receita.total_sub_receitas || 0}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Embalagens</div>
                  <div className="font-semibold">{receita.total_embalagens || 0}</div>
                </div>
              </div>

              {/* Linha 2 - Custos */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo M.O.</div>
                  <div className="font-semibold">R$ {(receita.custo_mao_obra || 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo Matéria-Prima</div>
                  <div className="font-semibold">R$ {(receita.custo_ingredientes || 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo Embalagem</div>
                  <div className="font-semibold">R$ {(receita.custo_embalagens || 0).toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-primary text-primary-foreground rounded">
                  <div className="text-xs">Custo Total</div>
                  <div className="font-semibold">R$ {custoTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Linha 3 - Rentabilidade */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Preço Venda</div>
                  <div className="font-semibold">R$ {receita.preco_venda.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Margem Contribuição</div>
                  <div className={`font-semibold ${margem > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {margem.toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Lucro Líquido</div>
                  <div className={`font-semibold ${margemPercentual > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margemPercentual.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
