import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMarcasCategorias, Categoria } from '@/hooks/useMarcasCategorias';

interface CategoriasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriasModal({ open, onOpenChange }: CategoriasModalProps) {
  const { fetchCategorias, createCategoria, updateCategoria, deleteCategoria } = useMarcasCategorias();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');

  const loadCategorias = async () => {
    const data = await fetchCategorias();
    setCategorias(data as Categoria[]);
  };

  useEffect(() => {
    if (open) {
      loadCategorias();
    }
  }, [open]);

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    const categoria = await createCategoria(novoNome);
    if (categoria) {
      setNovoNome('');
      loadCategorias();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editandoNome.trim()) return;
    const categoria = await updateCategoria(id, editandoNome);
    if (categoria) {
      setEditandoId(null);
      setEditandoNome('');
      loadCategorias();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteCategoria(id);
    if (success) {
      loadCategorias();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Criar nova categoria */}
          <div className="flex gap-2">
            <Input
              placeholder="Digite o nome da categoria..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de categorias */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {categorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                >
                  {editandoId === categoria.id ? (
                    <>
                      <Input
                        value={editandoNome}
                        onChange={(e) => setEditandoNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(categoria.id)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(categoria.id)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditandoId(null);
                          setEditandoNome('');
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">{categoria.nome}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditandoId(categoria.id);
                          setEditandoNome(categoria.nome);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(categoria.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}

              {categorias.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma categoria cadastrada
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
