import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CirclePlay, FolderPlus, ListVideo, Loader2, Plus, Trash2, Upload, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TutorialPlayer } from '@/components/tutorial/TutorialPlayer';

type Category = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

type TutorialVideo = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  sort_order: number;
  is_published: boolean;
};

const db = supabase;
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message) : 'Tente novamente em instantes.';

// Read every page so the API's default row limit does not hide older lessons.
async function loadRows<T>(table: 'tutorial_categories' | 'tutorial_videos', isAdmin: boolean): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 250;
  for (let offset = 0; ; offset += pageSize) {
    let query = db.from(table).select('*').order('sort_order').order('created_at').order('id')
      .range(offset, offset + pageSize - 1);
    if (!isAdmin) query = query.eq('is_published', true);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

export default function Tutorial() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<TutorialVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoCategory, setVideoCategory] = useState('');
  const [videoPublished, setVideoPublished] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadTutorial = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [categoryData, videoData] = await Promise.all([
        loadRows<Category>('tutorial_categories', isAdmin),
        loadRows<TutorialVideo>('tutorial_videos', isAdmin),
      ]);
      setCategories(categoryData);
      setVideos(videoData);
      setVideoCategory((current) => categoryData.some((item) => item.id === current) ? current : categoryData[0]?.id || '');
    } catch (error: unknown) {
      setLoadError(true);
      toast({ title: 'Não foi possível carregar os vídeos', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    void loadTutorial();
  }, [loadTutorial]);

  const videosByCategory = useMemo(() => {
    const grouped = new Map<string, TutorialVideo[]>();
    categories.forEach((category) => grouped.set(category.id, []));
    videos.forEach((video) => grouped.get(video.category_id)?.push(video));
    return grouped;
  }, [categories, videos]);

  const orderedVideos = useMemo(() => categories.flatMap((category) => videosByCategory.get(category.id) || []), [categories, videosByCategory]);
  const selectedVideo = orderedVideos.find((video) => video.id === selectedId) || orderedVideos[0];
  const selectedIndex = selectedVideo ? orderedVideos.findIndex((video) => video.id === selectedVideo.id) : -1;
  const selectedCategory = categories.find((category) => category.id === selectedVideo?.category_id);

  const createCategory = async () => {
    if (!categoryTitle.trim()) return;
    setSavingCategory(true);
    const { error } = await db.from('tutorial_categories').insert({
      title: categoryTitle.trim(),
      description: categoryDescription.trim() || null,
      sort_order: Math.max(-1, ...categories.map((category) => category.sort_order)) + 1,
      is_published: true,
    });
    setSavingCategory(false);
    if (error) {
      toast({ title: 'Erro ao criar categoria', description: errorMessage(error), variant: 'destructive' });
      return;
    }
    setCategoryTitle('');
    setCategoryDescription('');
    toast({ title: 'Categoria criada' });
    await loadTutorial();
  };

  const uploadVideo = async () => {
    if (!user || !videoFile || !videoTitle.trim() || !videoCategory) return;
    setUploading(true);
    const safeName = videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('tutorial-videos')
        .upload(storagePath, videoFile, { contentType: videoFile.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await db.from('tutorial_videos').insert({
        category_id: videoCategory,
        title: videoTitle.trim(),
        description: videoDescription.trim() || null,
        storage_path: storagePath,
        sort_order: Math.max(-1, ...videos.filter((video) => video.category_id === videoCategory).map((video) => video.sort_order)) + 1,
        is_published: videoPublished,
      });
      if (insertError) {
        await supabase.storage.from('tutorial-videos').remove([storagePath]);
        throw insertError;
      }

      setVideoTitle('');
      setVideoDescription('');
      setVideoFile(null);
      setVideoPublished(false);
      const fileInput = document.getElementById('tutorial-video-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      toast({ title: 'Vídeo enviado com sucesso' });
      await loadTutorial();
    } catch (error: unknown) {
      toast({ title: 'Erro ao enviar vídeo', description: errorMessage(error), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const toggleVideo = async (video: TutorialVideo) => {
    const { error } = await db
      .from('tutorial_videos')
      .update({ is_published: !video.is_published, updated_at: new Date().toISOString() })
      .eq('id', video.id);
    if (error) toast({ title: 'Erro ao alterar publicação', description: errorMessage(error), variant: 'destructive' });
    else await loadTutorial();
  };

  const moveVideo = async (video: TutorialVideo, categoryId: string) => {
    const { error } = await db
      .from('tutorial_videos')
      .update({ category_id: categoryId, sort_order: Math.max(-1, ...videos.filter((item) => item.category_id === categoryId).map((item) => item.sort_order)) + 1, updated_at: new Date().toISOString() })
      .eq('id', video.id);
    if (error) toast({ title: 'Erro ao mover vídeo', description: errorMessage(error), variant: 'destructive' });
    else await loadTutorial();
  };

  const deleteVideo = async (video: TutorialVideo) => {
    if (!window.confirm(`Apagar o vídeo "${video.title}"?`)) return;
    const { error } = await db.from('tutorial_videos').delete().eq('id', video.id);
    if (error) {
      toast({ title: 'Erro ao apagar vídeo', description: errorMessage(error), variant: 'destructive' });
      return;
    }
    await supabase.storage.from('tutorial-videos').remove([video.storage_path]);
    toast({ title: 'Vídeo apagado' });
    await loadTutorial();
  };

  const toggleCategory = async (category: Category) => {
    const { error } = await db
      .from('tutorial_categories')
      .update({ is_published: !category.is_published, updated_at: new Date().toISOString() })
      .eq('id', category.id);
    if (error) toast({ title: 'Erro ao alterar categoria', description: errorMessage(error), variant: 'destructive' });
    else await loadTutorial();
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Apagar a categoria "${category.title}"?`)) return;
    const { error } = await db.from('tutorial_categories').delete().eq('id', category.id);
    if (error) {
      toast({
        title: 'Não foi possível apagar',
        description: 'Mova ou apague os vídeos desta categoria primeiro.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Categoria apagada' });
    await loadTutorial();
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (loadError) {
    return <Card><CardContent className="space-y-4 p-8 text-center"><p>Não foi possível carregar as aulas.</p><Button onClick={() => void loadTutorial()}>Tentar novamente</Button></CardContent></Card>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Aulas e tutoriais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aprenda no seu ritmo, seguindo os módulos e as aulas.</p>
        </div>
        {isAdmin && <Button onClick={() => setShowEditor((value) => !value)} aria-expanded={showEditor} aria-controls="tutorial-editor" className="gap-2"><Plus className="h-4 w-4" /> {showEditor ? 'Fechar envio' : 'Adicionar conteúdo'}</Button>}
      </header>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Card className="order-2 min-w-0 overflow-hidden rounded-2xl xl:order-1">
          <CardHeader className="border-b p-4">
            <CardTitle className="flex items-center gap-2 text-base"><ListVideo className="h-5 w-5 text-primary" /> Conteúdo das aulas</CardTitle>
            <p className="text-xs text-muted-foreground">{categories.length} módulos · {orderedVideos.length} aulas</p>
          </CardHeader>
          <nav aria-label="Módulos e aulas" className="max-h-[65svh] overflow-y-auto xl:max-h-[calc(100svh-240px)]">
            {categories.length === 0 && <p className="p-5 text-sm text-muted-foreground">{isAdmin ? 'Adicione o primeiro módulo para organizar suas aulas.' : 'Novas aulas serão adicionadas em breve.'}</p>}
            {categories.map((category, categoryIndex) => (
              <details key={category.id} open className="group border-b last:border-b-0">
                <summary className="cursor-pointer break-words bg-muted/40 p-4 text-sm font-semibold focus-visible:outline-primary">
                  {String(categoryIndex + 1).padStart(2, '0')}. {category.title}
                  {isAdmin && !category.is_published && <span className="ml-2 text-xs font-normal text-muted-foreground">Oculto</span>}
                </summary>
                {category.description && <p className="px-4 pt-3 text-xs text-muted-foreground">{category.description}</p>}
                <ol className="space-y-1 p-2">
                  {(videosByCategory.get(category.id) || []).map((video, index) => (
                    <li key={video.id}>
                      <button type="button" onClick={() => setSelectedId(video.id)} aria-current={selectedVideo?.id === video.id ? 'step' : undefined}
                        className={`flex min-h-12 w-full items-start gap-3 rounded-xl p-3 text-left text-sm transition-colors focus-visible:outline-primary ${selectedVideo?.id === video.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}>
                        <CirclePlay aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words"><span className="mr-1 opacity-60">{index + 1}.</span> {video.title}{isAdmin && !video.is_published && <span className="mt-1 block text-xs font-normal text-muted-foreground">Rascunho</span>}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                {isAdmin && (
                  <details className="px-4 pb-4 text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Gerenciar módulo</summary>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between gap-2"><Label htmlFor={`module-${category.id}`} className="text-xs">Publicado</Label><Switch id={`module-${category.id}`} checked={category.is_published} onCheckedChange={() => void toggleCategory(category)} /></div>

                      <Button size="sm" variant="ghost" onClick={() => void deleteCategory(category)} className="gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Excluir módulo</Button>
                    </div>
                  </details>
                )}
              </details>
            ))}
          </nav>
        </Card>

        <div className="order-1 min-w-0 space-y-4 xl:order-2">
          {selectedVideo ? (
            <Card className="overflow-hidden rounded-2xl">
              <TutorialPlayer key={selectedVideo.id} storagePath={selectedVideo.storage_path} title={selectedVideo.title} />
              <CardContent className="space-y-5 p-4 sm:p-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{selectedCategory?.title} · Aula {selectedIndex + 1} de {orderedVideos.length}</p>
                  <h2 className="break-words font-display text-xl font-bold sm:text-2xl">{selectedVideo.title}</h2>
                  {selectedVideo.description && <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{selectedVideo.description}</p>}
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                  <Button variant="outline" disabled={selectedIndex <= 0} onClick={() => setSelectedId(orderedVideos[selectedIndex - 1].id)} className="gap-1"><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                  <Button disabled={selectedIndex >= orderedVideos.length - 1} onClick={() => setSelectedId(orderedVideos[selectedIndex + 1].id)} className="gap-1">Próxima aula <ChevronRight className="h-4 w-4" /></Button>
                </div>
                {isAdmin && (
                  <details className="border-t pt-4">
                    <summary className="cursor-pointer text-sm font-medium">Gerenciar esta aula</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-3"><Switch id="selected-published" checked={selectedVideo.is_published} onCheckedChange={() => void toggleVideo(selectedVideo)} /><Label htmlFor="selected-published">Aula publicada</Label></div>
                      <div><Label htmlFor="selected-category">Módulo</Label><Select value={selectedVideo.category_id} onValueChange={(value) => void moveVideo(selectedVideo, value)}><SelectTrigger id="selected-category"><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></div>

                      <Button variant="outline" onClick={() => void deleteVideo(selectedVideo)} className="gap-2 self-end text-destructive"><Trash2 className="h-4 w-4" /> Excluir aula</Button>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Video className="mb-4 h-12 w-12 text-muted-foreground" /><h2 className="text-xl font-semibold">Suas aulas começam aqui</h2><p className="mt-2 text-sm text-muted-foreground">{isAdmin ? 'Crie um módulo e envie o primeiro vídeo em Adicionar conteúdo.' : 'Novos tutoriais serão adicionados em breve.'}</p></CardContent></Card>
          )}
        </div>
      </div>

      {isAdmin && showEditor && (
        <div id="tutorial-editor" className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5" /> Novo módulo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="category-title">Nome</Label><Input maxLength={80} id="category-title" value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)} placeholder="Ex.: Primeiros passos" /></div>
              <div><Label htmlFor="category-description">Descrição</Label><Textarea id="category-description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="O que o usuário aprenderá neste módulo" /></div>
              <Button onClick={createCategory} disabled={savingCategory || !categoryTitle.trim()} className="gap-2">
                {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar módulo
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Enviar vídeo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="video-title">Título</Label><Input maxLength={120} id="video-title" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Título do vídeo" /></div>
              <div><Label htmlFor="upload-module">Módulo</Label><Select value={videoCategory} onValueChange={setVideoCategory}><SelectTrigger id="upload-module"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="video-description">Descrição</Label><Textarea id="video-description" value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder="Resumo opcional" /></div>
              <div><Label htmlFor="tutorial-video-file">Arquivo de vídeo</Label><Input id="tutorial-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} disabled={uploading} /><p className="mt-2 text-xs text-muted-foreground">Seu vídeo é enviado na qualidade original. Para maior compatibilidade, prefira MP4 (H.264).</p></div>
              <div className="flex items-center gap-3"><Switch id="upload-published" checked={videoPublished} onCheckedChange={setVideoPublished} /><Label htmlFor="upload-published">Publicar imediatamente</Label></div>
              <Button onClick={uploadVideo} disabled={uploading || !videoFile || !videoTitle.trim() || !videoCategory} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Enviando...' : 'Enviar vídeo'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
