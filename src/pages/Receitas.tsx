import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CriarReceitaModal } from '@/components/receitas/CriarReceitaModal';

interface Receita {
  id: string;
  nome: string;
  tempo_preparo_total: number;
  tempo_preparo_mao_obra: number;
  tipo_produto: string;
  rendimento: string;
  ingredientes_count: number;
  sub_receitas_count: number;
  embalagens_count: number;
  created_at: string;
  updated_at: string;
}

const Receitas = () => {
  const [receitas] = useState<Receita[]>([
    // Mock data para exemplo
    {
      id: '1',
      nome: 'Bolo de Chocolate',
      tempo_preparo_total: 90,
      tempo_preparo_mao_obra: 30,
      tipo_produto: 'Doce',
      rendimento: '8 fatias',
      ingredientes_count: 12,
      sub_receitas_count: 1,
      embalagens_count: 2,
      created_at: '2024-01-15',
      updated_at: '2024-01-15'
    }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Receitas</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e seus custos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Receita
        </Button>
      </div>

      <div className="grid gap-4">
        {receitas.map((receita) => (
          <Card key={receita.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{receita.nome}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{receita.tipo_produto}</Badge>
                    <Badge variant="outline">Rendimento: {receita.rendimento}</Badge>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Criado: {new Date(receita.created_at).toLocaleDateString()}</p>
                  <p>Atualizado: {new Date(receita.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tempo Total</p>
                  <p className="font-medium">{receita.tempo_preparo_total} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tempo M.O.</p>
                  <p className="font-medium">{receita.tempo_preparo_mao_obra} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ingredientes</p>
                  <p className="font-medium">{receita.ingredientes_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sub-receitas</p>
                  <p className="font-medium">{receita.sub_receitas_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Embalagens</p>
                  <p className="font-medium">{receita.embalagens_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {receitas.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Nenhuma receita criada</h3>
                  <p className="text-muted-foreground">Comece criando sua primeira receita</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Receita
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CriarReceitaModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};

export default Receitas;