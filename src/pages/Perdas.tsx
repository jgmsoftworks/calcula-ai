import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package, ChefHat, AlertTriangle } from 'lucide-react';
import { usePerdas, Perda } from '@/hooks/usePerdas';
import { RegistrarPerdaModal } from '@/components/estoque/perdas/RegistrarPerdaModal';
import { formatBRL } from '@/lib/formatters';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function Perdas() {
  const { fetchPerdas, excluirPerda, loading } = usePerdas();
  const [perdas, setPerdas] = useState<Perda[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [perdaParaExcluir, setPerdaParaExcluir] = useState<Perda | null>(null);

  const load = async () => setPerdas(await fetchPerdas());

  useEffect(() => { load(); }, []);

  const totalPerda = perdas.reduce((s, p) => s + Number(p.custo_total || 0), 0);
  const totalProdutos = perdas.filter(p => p.tipo === 'produto').length;
  const totalReceitas = perdas.filter(p => p.tipo === 'receita').length;

  const handleConfirmDelete = async () => {
    if (!perdaParaExcluir) return;
    const ok = await excluirPerda(perdaParaExcluir.id);
    setPerdaParaExcluir(null);
    if (ok) load();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header com totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">Total perdido</p>
          <p className="text-2xl font-bold text-destructive">{formatBRL(totalPerda)}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">Perdas de produtos</p>
          <p className="text-2xl font-bold">{totalProdutos}</p>
        </Card>
        <Card className="p-4 glass-card">
          <p className="text-xs text-muted-foreground">Perdas de receitas</p>
          <p className="text-2xl font-bold">{totalReceitas}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Histórico de perdas</h3>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Registrar perda
        </Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando...</Card>
      ) : perdas.length === 0 ? (
        <Card className="p-10 text-center glass-card">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma perda registrada ainda.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {perdas.map(p => (
            <Card key={p.id} className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.tipo === 'produto' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'}`}>
                {p.tipo === 'produto' ? <Package className="h-5 w-5" /> : <ChefHat className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{p.nome_item}</p>
                  <Badge variant="outline" className="text-[10px]">{p.tipo === 'produto' ? 'Produto' : 'Receita'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.data_perda).toLocaleString('pt-BR')} · Qtd: {p.quantidade} · {p.motivo}
                  {p.motivo === 'Outro' && p.motivo_outro ? ` (${p.motivo_outro})` : ''}
                  {p.responsavel ? ` · ${p.responsavel}` : ''}
                </p>
                {p.observacao && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">{p.observacao}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">Custo</p>
                <p className="font-bold text-destructive">{formatBRL(Number(p.custo_total))}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setPerdaParaExcluir(p)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <RegistrarPerdaModal open={modalOpen} onOpenChange={setModalOpen} onSaved={load} />

      <AlertDialog open={!!perdaParaExcluir} onOpenChange={(o) => !o && setPerdaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o registro da perda. A movimentação de estoque já realizada NÃO será revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
