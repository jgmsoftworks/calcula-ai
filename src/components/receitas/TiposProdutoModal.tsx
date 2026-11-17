import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTiposProduto } from '@/hooks/useTiposProduto';
import { ordenarTiposProduto, salvarTipoProduto, tiposProdutoKey, type TipoProduto } from '@/lib/tiposProdutoData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Search, Shapes } from 'lucide-react';
import { TipoProdutoEditor } from './TipoProdutoEditor';

interface TiposProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (tipoId: string) => void;
}

export function TiposProdutoModal(props: TiposProdutoModalProps) {
  const { user } = useAuth();
  return <TiposProdutoContent key={`${user?.id}:${props.open}`} {...props} />;
}

function TiposProdutoContent({ open, onOpenChange, onSelect }: TiposProdutoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tiposQuery = useTiposProduto(open);
  const tipos = tiposQuery.data || [];
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const [editor, setEditor] = useState<TipoProduto | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = tipos.filter(tipo => normalize(tipo.nome).includes(normalize(search)));

  const syncTipos = async (update: (previous: TipoProduto[]) => TipoProduto[]) => {
    if (!user) return;
    const queryKey = tiposProdutoKey(user.id);
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<TipoProduto[]>(queryKey, previous => ordenarTiposProduto(update(previous || [])));
    void queryClient.invalidateQueries({ queryKey });
    void queryClient.invalidateQueries({ queryKey: ['receitas-lista', user.id] });
    void queryClient.invalidateQueries({ queryKey: ['geladeira', user.id] });
  };
  const save = async (input: Pick<TipoProduto, 'nome' | 'imagem_url'>) => {
    if (!user || busy.current) return;
    const existing = editor && editor !== 'new' ? editor : undefined;
    busy.current = true; setLoading(true);
    try {
      const data = await salvarTipoProduto(user.id, input, existing?.id);
      await syncTipos(previous => [...previous.filter(tipo => tipo.id !== data.id), data]);
      setEditor(null);
      toast({ title: 'Sucesso', description: 'Tipo de produto salvo com sucesso.' });
      if (!existing) onSelect?.(data.id);
    } catch (error) {
      console.error('Erro ao salvar tipo:', error);
      toast({ title: 'Erro', description: 'Não foi possível salvar o tipo de produto. Tente novamente.', variant: 'destructive' });
    } finally { busy.current = false; setLoading(false); }
  };
  const remove = async (tipo: TipoProduto) => {
    if (!user || busy.current || !confirm(`Excluir o tipo “${tipo.nome}”?`)) return;
    busy.current = true; setLoading(true);
    try {
      const { count, error: usageError } = await supabase.from('receitas').select('*', { count: 'exact', head: true }).eq('tipo_produto_id', tipo.id).eq('user_id', user.id);
      if (usageError) throw usageError;
      if (count) {
        toast({ title: 'Não é possível excluir', description: `Este tipo está sendo usado em ${count} receita(s).`, variant: 'destructive' });
        return;
      }
      const { error } = await supabase.from('tipos_produto').delete().eq('id', tipo.id).eq('user_id', user.id);
      if (error) throw error;
      await syncTipos(previous => previous.filter(t => t.id !== tipo.id));
      toast({ title: 'Sucesso', description: 'Tipo de produto excluído.' });
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      toast({ title: 'Erro', description: 'Não foi possível excluir o tipo de produto.', variant: 'destructive' });
    } finally { busy.current = false; setLoading(false); }
  };

  return <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-5 py-5 text-left sm:px-6">
        <DialogTitle className="flex items-center gap-3 pr-6"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Shapes className="h-5 w-5" /></span>Tipos de produto</DialogTitle>
        <DialogDescription className="pt-1">Organize suas receitas com nomes e fotos fáceis de identificar.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
        {editor ? <TipoProdutoEditor key={editor === 'new' ? 'new' : editor.id} tipo={editor === 'new' ? undefined : editor} saving={loading} onSave={input => void save(input)} onCancel={() => setEditor(null)} /> : <Button className="w-full" onClick={() => setEditor('new')} disabled={loading}><Plus className="mr-2 h-4 w-4" />Criar Novo Tipo</Button>}
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar tipos de produto" placeholder="Buscar tipo..." value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>TIPOS CADASTRADOS</span><span>{tipos.length}</span></div>
        {tiposQuery.isError && <div role="alert" className="rounded-xl border border-destructive/20 p-3 text-sm"><p>Não foi possível carregar os tipos de produto.</p><Button variant="link" disabled={tiposQuery.isFetching} onClick={() => void tiposQuery.refetch()}>Tentar novamente</Button></div>}
        {tiposQuery.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Carregando tipos de produto…</p> : !tiposQuery.isError && !visible.length ? <p className="py-8 text-center text-sm text-muted-foreground">{search ? 'Nenhum tipo encontrado.' : 'Nenhum tipo de produto cadastrado'}</p> : <div className="space-y-2">
          {visible.map(tipo => <div key={tipo.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/25">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/5 text-primary">{tipo.imagem_url ? <img src={tipo.imagem_url} alt={`Foto de ${tipo.nome}`} loading="lazy" className="h-full w-full object-cover" /> : <Shapes className="h-5 w-5" />}</div>
            <span className="min-w-0 flex-1 break-words text-sm font-semibold">{tipo.nome}</span>
            <Button size="icon" variant="ghost" aria-label={`Editar ${tipo.nome}`} disabled={loading} onClick={() => setEditor(tipo)}><Edit2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Excluir ${tipo.nome}`} disabled={loading} onClick={() => void remove(tipo)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
