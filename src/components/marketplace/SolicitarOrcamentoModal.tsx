import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Package, Plus, X } from 'lucide-react';

const orcamentoSchema = z.object({
  mensagem: z.string().trim().min(10, 'Mensagem muito curta').max(1000, 'Mensagem muito longa'),
  produtos: z.array(z.object({
    nome: z.string().trim().min(1, 'Nome do produto é obrigatório').max(100, 'Nome muito longo'),
    quantidade: z.number().min(1, 'Quantidade mínima é 1'),
    unidade: z.string().trim().min(1, 'Unidade é obrigatória').max(20, 'Unidade muito longa'),
  })).min(1, 'Adicione pelo menos um produto'),
});

interface SolicitarOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedorId: string;
  fornecedorNome: string;
  onSuccess?: () => void;
}

interface Produto {
  nome: string;
  quantidade: number;
  unidade: string;
}

export default function SolicitarOrcamentoModal({ 
  open, 
  onOpenChange, 
  fornecedorId,
  fornecedorNome,
  onSuccess 
}: SolicitarOrcamentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([
    { nome: '', quantidade: 1, unidade: 'kg' }
  ]);

  const addProduto = () => {
    setProdutos([...produtos, { nome: '', quantidade: 1, unidade: 'kg' }]);
  };

  const removeProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const updateProduto = (index: number, field: keyof Produto, value: string | number) => {
    const updated = [...produtos];
    updated[index] = { ...updated[index], [field]: value };
    setProdutos(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        mensagem,
        produtos,
      };

      const validated = orcamentoSchema.parse(data);
      
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para solicitar orçamentos');
        return;
      }

      const { error } = await supabase
        .from('orcamentos_fornecedores')
        .insert({
          cliente_user_id: user.id,
          fornecedor_id: fornecedorId,
          mensagem: validated.mensagem,
          produtos_solicitados: validated.produtos,
          status: 'pendente',
        });

      if (error) throw error;

      toast.success(`Orçamento solicitado para ${fornecedorNome}!`);
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setMensagem('');
      setProdutos([{ nome: '', quantidade: 1, unidade: 'kg' }]);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao solicitar orçamento:', error);
        toast.error('Erro ao solicitar orçamento');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Orçamento - {fornecedorNome}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="mensagem">Mensagem para o Fornecedor *</Label>
            <Textarea
              id="mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva suas necessidades, condições de pagamento desejadas, etc..."
              maxLength={1000}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {mensagem.length}/1000 caracteres
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Produtos Solicitados *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProduto}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Produto
              </Button>
            </div>

            {produtos.map((produto, index) => (
              <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                <Package className="h-5 w-5 text-muted-foreground mt-2" />
                
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <Input
                      placeholder="Nome do produto"
                      value={produto.nome}
                      onChange={(e) => updateProduto(index, 'nome', e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>
                  
                  <div>
                    <Input
                      type="number"
                      placeholder="Qtd"
                      min="1"
                      step="0.01"
                      value={produto.quantidade}
                      onChange={(e) => updateProduto(index, 'quantidade', parseFloat(e.target.value) || 1)}
                      required
                    />
                  </div>
                  
                  <div>
                    <Input
                      placeholder="Unidade"
                      value={produto.unidade}
                      onChange={(e) => updateProduto(index, 'unidade', e.target.value)}
                      maxLength={20}
                      required
                    />
                  </div>
                </div>

                {produtos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProduto(index)}
                    className="mt-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-primary/5 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Seja específico sobre quantidades, marcas preferidas e condições de entrega para receber orçamentos mais precisos.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar Orçamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
