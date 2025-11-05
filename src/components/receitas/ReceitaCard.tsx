import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import type { Receita } from '@/types/receitas';
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
  receita: Receita;
  onEdit: (receita: Receita) => void;
  onDelete: () => void;
}

export function ReceitaCard({ receita, onEdit, onDelete }: ReceitaCardProps) {
  const { deleteReceita } = useReceitas();

  const handleDelete = async () => {
    const success = await deleteReceita(receita.id);
    if (success) onDelete();
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
          {receita.imagem_url ? (
            <img
              src={receita.imagem_url}
              alt={receita.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold truncate">{receita.nome}</h3>
            <Badge variant={receita.status === 'finalizada' ? 'default' : 'secondary'}>
              {receita.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
            </Badge>
          </div>

          {receita.tipo_produto && (
            <p className="text-sm text-muted-foreground">{receita.tipo_produto}</p>
          )}

          <div className="pt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço:</span>
              <span className="font-medium">
                R$ {receita.preco_venda.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(receita)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
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
      </CardContent>
    </Card>
  );
}
