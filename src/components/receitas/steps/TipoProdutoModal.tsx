import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Edit2, Trash2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TipoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTipoProdutoCreated: (tipo: { id: string; nome: string }) => void;
  existingTipos: { id: string; nome: string }[];
  onTipoProdutoUpdated: (tipos: { id: string; nome: string }[]) => void;
}

export const TipoProdutoModal = ({ 
  isOpen, 
  onClose, 
  onTipoProdutoCreated, 
  existingTipos, 
  onTipoProdutoUpdated 
}: TipoProdutoModalProps) => {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();

  // Filtrar tipos baseado na busca
  const filteredTipos = existingTipos.filter(tipo =>
    tipo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe
    if (existingTipos.some(tipo => tipo.nome.toLowerCase() === nome.trim().toLowerCase())) {
      toast({
        title: "Tipo já existe",
        description: "Este tipo de produto já foi cadastrado anteriormente",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const novoTipo = {
        id: Date.now().toString(),
        nome: nome.trim()
      };

      onTipoProdutoCreated(novoTipo);
      
      toast({
        title: "Tipo de produto cadastrado com sucesso!",
      });

      setNome('');
      onClose();
    } catch (error: any) {
      console.error('Erro ao cadastrar tipo:', error);
      toast({
        title: "Erro ao cadastrar tipo de produto",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNome('');
    setSearchTerm('');
    setEditingId(null);
    setEditingName('');
    onClose();
  };

  const handleEdit = (tipo: { id: string; nome: string }) => {
    setEditingId(tipo.id);
    setEditingName(tipo.nome);
  };

  const handleSaveEdit = async (tipoId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "Nome é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe (excluindo o item sendo editado)
    if (existingTipos.some(tipo => 
      tipo.id !== tipoId && 
      tipo.nome.toLowerCase() === editingName.trim().toLowerCase()
    )) {
      toast({
        title: "Tipo já existe",
        description: "Este tipo de produto já foi cadastrado anteriormente",
        variant: "destructive"
      });
      return;
    }

    try {
      const tiposAtualizados = existingTipos.map(tipo =>
        tipo.id === tipoId ? { ...tipo, nome: editingName.trim() } : tipo
      );

      onTipoProdutoUpdated(tiposAtualizados);

      toast({
        title: "Tipo de produto atualizado com sucesso!",
      });

      // Resetar estado de edição
      setEditingId(null);
      setEditingName('');
    } catch (error: any) {
      console.error('Erro ao atualizar tipo:', error);
      toast({
        title: "Erro ao atualizar tipo de produto",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (tipoId: string, tipoNome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o tipo "${tipoNome}"?`)) {
      return;
    }

    try {
      const tiposAtualizados = existingTipos.filter(tipo => tipo.id !== tipoId);
      onTipoProdutoUpdated(tiposAtualizados);

      toast({
        title: "Tipo de produto excluído com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao excluir tipo:', error);
      toast({
        title: "Erro ao excluir tipo de produto",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Plus className="w-5 h-5" />
            Gerenciar Tipos de Produto
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 p-2">
          {/* Formulário para novo tipo */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium text-foreground">
                Novo Tipo de Produto
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Doce, Salgado, Bebida..."
                className="h-12 border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base px-4 rounded-lg"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 px-6"
              >
                {loading ? 'Salvando...' : 'Adicionar Tipo'}
              </Button>
            </div>
          </form>

          {/* Divisor */}
          <div className="border-t border-border"></div>

          {/* Lista de tipos existentes */}
          {existingTipos.length > 0 && (
            <div className="space-y-3 flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">
                  Tipos cadastrados ({existingTipos.length})
                </Label>
                
                {/* Campo de busca */}
                <div className="relative w-64 p-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar tipos..."
                    className="pl-10 h-10 border border-border rounded-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64 border border-border rounded-md p-6 bg-muted/10 m-1">
                {filteredTipos.length > 0 ? (
                  filteredTipos.map((tipo) => (
                    <div
                      key={tipo.id}
                      className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      {editingId === tipo.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 h-9 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(tipo.id)}
                            className="h-9 px-3 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="h-9 px-3 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium">
                            {tipo.nome}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(tipo)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              title="Editar tipo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(tipo.id, tipo.nome)}
                              className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              title="Excluir tipo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum tipo encontrado' : 'Nenhum tipo cadastrado'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão fechar */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};