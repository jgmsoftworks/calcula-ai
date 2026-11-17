import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Search, Tag, Tags, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CatalogoFotoEditor } from '@/components/catalogo/CatalogoFotoEditor';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { catalogoEstoqueKey, fetchCatalogoEstoque, ordenarCatalogo, removerCatalogoEstoque, salvarCatalogoEstoque, type CatalogoEstoqueItem, type CatalogoEstoqueTabela } from '@/lib/catalogoEstoqueData';

interface Props { tabela: CatalogoEstoqueTabela; open: boolean; onOpenChange: (open: boolean) => void }
export function CatalogoEstoqueModal(props: Props) {
  const { user } = useAuth();
  return <CatalogoEstoqueContent key={`${user?.id}:${props.tabela}:${props.open}`} {...props} />;
}
function CatalogoEstoqueContent({ tabela, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const marca = tabela === 'marcas';
  const singular = marca ? 'marca' : 'categoria';
  const title = marca ? 'Marcas' : 'Categorias';
  const Icon = marca ? Tag : Tags;
  const queryKey = catalogoEstoqueKey(tabela, user?.id);
  const query = useQuery({ queryKey, enabled: open && !!user, queryFn: ({ signal }) => fetchCatalogoEstoque(tabela, user!.id, signal) });
  const items = query.data || [];
  const [editor, setEditor] = useState<CatalogoEstoqueItem | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = items.filter(item => normalize(item.nome).includes(normalize(search)));
  const sync = async (change: (old: CatalogoEstoqueItem[]) => CatalogoEstoqueItem[]) => {
    await queryClient.cancelQueries({ queryKey });
    queryClient.setQueryData<CatalogoEstoqueItem[]>(queryKey, old => ordenarCatalogo(change(old || [])));
    void queryClient.invalidateQueries({ queryKey });
  };
  const save = async (input: Pick<CatalogoEstoqueItem, 'nome' | 'imagem_url'>) => {
    if (!user || busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const saved = await salvarCatalogoEstoque(tabela, user.id, input, editor && editor !== 'new' ? editor.id : undefined);
      await sync(old => [...old.filter(item => item.id !== saved.id), saved]);
      setEditor(null);
      toast({ title: marca ? 'Marca salva' : 'Categoria salva' });
    } catch (error) {
      const duplicate = typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
      toast({ title: 'Não foi possível salvar', description: duplicate ? `Já existe uma ${singular} com esse nome.` : 'Confira os dados e tente novamente.', variant: 'destructive' });
    } finally { busy.current = false; setSaving(false); }
  };
  const remove = async (item: CatalogoEstoqueItem) => {
    if (!user || busy.current || !confirm(`Excluir a ${singular} “${item.nome}”?`)) return;
    busy.current = true; setSaving(true);
    try {
      await removerCatalogoEstoque(tabela, user.id, item);
      await sync(old => old.filter(value => value.id !== item.id));
      if (editor !== 'new' && editor?.id === item.id) setEditor(null);
      toast({ title: marca ? 'Marca removida' : 'Categoria removida' });
    } catch (error) {
      toast({ title: 'Não foi possível remover', description: error instanceof Error ? error.message : 'Tente novamente.', variant: 'destructive' });
    } finally { busy.current = false; setSaving(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="border-b px-5 py-5 text-left sm:px-6">
        <DialogTitle className="flex items-center gap-3 pr-6"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>{title}</DialogTitle>
        <DialogDescription className="pt-1">Organize seus produtos com nomes e fotos fáceis de identificar.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
        {editor ? <CatalogoFotoEditor key={editor === 'new' ? 'new' : editor.id} item={editor === 'new' ? undefined : editor} saving={saving} onSave={input => void save(input)} onCancel={() => setEditor(null)} labels={{ name: `Nome da ${singular}`, photo: `Foto da ${singular}`, preview: `Foto da ${singular}`, save: `Salvar ${singular}`, action: editor === 'new' ? `Criar ${singular}` : 'Salvar alterações', placeholder: marca ? 'Ex.: Nestlé' : 'Ex.: Embalagens' }} /> : <Button className="w-full" disabled={saving} onClick={() => setEditor('new')}><Plus className="mr-2 h-4 w-4" />{marca ? 'Criar nova marca' : 'Criar nova categoria'}</Button>}
        <div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input aria-label={`Buscar ${tabela}`} placeholder={`Buscar ${singular}...`} value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div>
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{title.toUpperCase()} CADASTRADAS</span><span>{items.length}</span></div>
        {query.isError && <div role="alert" className="rounded-xl border border-destructive/20 p-3 text-sm"><p>Não foi possível carregar {tabela}.</p><Button variant="link" disabled={query.isFetching} onClick={() => void query.refetch()}>Tentar novamente</Button></div>}
        {query.isPending ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Carregando {tabela}…</p> : !query.isError && !visible.length ? <p className="py-8 text-center text-sm text-muted-foreground">{search ? `Nenhuma ${singular} encontrada.` : `Nenhuma ${singular} cadastrada.`}</p> : <div className="space-y-2">
          {visible.map(item => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 transition-colors hover:border-primary/25">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/5 text-primary">{item.imagem_url ? <img src={item.imagem_url} alt={`Foto de ${item.nome}`} loading="lazy" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5" />}</div>
            <span className="min-w-0 flex-1 break-words text-sm font-semibold">{item.nome}</span>
            <Button size="icon" variant="ghost" aria-label={`Editar ${item.nome}`} disabled={saving} onClick={() => setEditor(item)}><Edit2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Excluir ${item.nome}`} disabled={saving} onClick={() => void remove(item)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
