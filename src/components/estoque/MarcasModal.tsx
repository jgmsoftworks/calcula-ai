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
import { useMarcasCategorias, Marca } from '@/hooks/useMarcasCategorias';

interface MarcasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarcasModal({ open, onOpenChange }: MarcasModalProps) {
  const { fetchMarcas, createMarca, updateMarca, deleteMarca } = useMarcasCategorias();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');

  const loadMarcas = async () => {
    const data = await fetchMarcas();
    setMarcas(data as Marca[]);
  };

  useEffect(() => {
    if (open) {
      loadMarcas();
    }
  }, [open]);

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    const marca = await createMarca(novoNome);
    if (marca) {
      setNovoNome('');
      loadMarcas();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editandoNome.trim()) return;
    const marca = await updateMarca(id, editandoNome);
    if (marca) {
      setEditandoId(null);
      setEditandoNome('');
      loadMarcas();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteMarca(id);
    if (success) {
      loadMarcas();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Marcas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Criar nova marca */}
          <div className="flex gap-2">
            <Input
              placeholder="Digite o nome da marca..."
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de marcas */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {marcas.map((marca) => (
                <div
                  key={marca.id}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                >
                  {editandoId === marca.id ? (
                    <>
                      <Input
                        value={editandoNome}
                        onChange={(e) => setEditandoNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate(marca.id)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(marca.id)}
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
                      <span className="flex-1">{marca.nome}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditandoId(marca.id);
                          setEditandoNome(marca.nome);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(marca.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))}

              {marcas.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma marca cadastrada
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
