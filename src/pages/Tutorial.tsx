import { useEffect, useMemo, useState } from 'react';
import { CirclePlay, FolderPlus, Loader2, Plus, Trash2, Upload, Video } from 'lucide-react';
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
  signed_url?: string;
};

const db = supabase as any;

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

  const loadTutorial = async () => {
    setLoading(true);
    try {
      let categoryQuery = db.from('tutorial_categories').select('*').order('sort_order').order('created_at');
      let videoQuery = db.from('tutorial_videos').select('*').order('sort_order').order('created_at');
      if (!isAdmin) {
        categoryQuery = categoryQuery.eq('is_published', true);
        videoQuery = videoQuery.eq('is_published', true);
      }

      const [{ data: categoryData, error: categoryError }, { data: videoData, error: videoError }] =
        await Promise.all([categoryQuery, videoQuery]);
      if (categoryError) throw categoryError;
      if (videoError) throw videoError;

      const hydratedVideos = await Promise.all(
        ((videoData || []) as TutorialVideo[]).map(async (video) => {
          const { data } = await supabase.storage
            .from('tutorial-videos')
            .createSignedUrl(video.storage_path, 60 * 60);
          return { ...video, signed_url: data?.signedUrl };
        }),
      );

      setCategories((categoryData || []) as Category[]);
      setVideos(hydratedVideos);
      if (!videoCategory && categoryData?.[0]?.id) setVideoCategory(categoryData[0].id);
    } catch (error: any) {
      toast({ title: 'Não foi possível carregar os vídeos', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTutorial();
  }, [isAdmin]);

  const videosByCategory = useMemo(() => {
    const grouped = new Map<string, TutorialVideo[]>();
    categories.forEach((category) => grouped.set(category.id, []));
    videos.forEach((video) => grouped.get(video.category_id)?.push(video));
    return grouped;
  }, [categories, videos]);

  const createCategory = async () => {
    if (!categoryTitle.trim()) return;
    setSavingCategory(true);
    const { error } = await db.from('tutorial_categories').insert({
      title: categoryTitle.trim(),
      description: categoryDescription.trim() || null,
      sort_order: categories.length,
      is_published: true,
    });
    setSavingCategory(false);
    if (error) {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
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
        sort_order: videos.filter((video) => video.category_id === videoCategory).length,
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
    } catch (error: any) {
      toast({ title: 'Erro ao enviar vídeo', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const toggleVideo = async (video: TutorialVideo) => {
    const { error } = await db
      .from('tutorial_videos')
      .update({ is_published: !video.is_published, updated_at: new Date().toISOString() })
      .eq('id', video.id);
    if (error) toast({ title: 'Erro ao alterar publicação', description: error.message, variant: 'destructive' });
    else await loadTutorial();
  };

  const moveVideo = async (video: TutorialVideo, categoryId: string) => {
    const { error } = await db
      .from('tutorial_videos')
      .update({ category_id: categoryId, updated_at: new Date().toISOString() })
      .eq('id', video.id);
    if (error) toast({ title: 'Erro ao mover vídeo', description: error.message, variant: 'destructive' });
    else await loadTutorial();
  };

  const deleteVideo = async (video: TutorialVideo) => {
    if (!window.confirm(`Apagar o vídeo "${video.title}"?`)) return;
    const { error } = await db.from('tutorial_videos').delete().eq('id', video.id);
    if (error) {
      toast({ title: 'Erro ao apagar vídeo', description: error.message, variant: 'destructive' });
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
    if (error) toast({ title: 'Erro ao alterar categoria', description: error.message, variant: 'destructive' });
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[hsl(273,63%,42%)] to-[hsl(340,91%,45%)] p-5 text-white sm:p-8 md:p-12">
        <div className="flex max-w-3xl items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3"><CirclePlay className="h-8 w-8" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl md:text-5xl">Tutoriais em vídeo</h1>
            <p className="mt-3 text-lg text-white/80">Aprenda a usar o CalculaAi com vídeos rápidos, organizados por categoria.</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><FolderPlus className="h-5 w-5" /> Nova categoria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="category-title">Nome</Label><Input id="category-title" value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)} placeholder="Ex.: Primeiros passos" /></div>
              <div><Label htmlFor="category-description">Descrição</Label><Textarea id="category-description" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} placeholder="O que o usuário aprenderá nesta categoria" /></div>
              <Button onClick={createCategory} disabled={savingCategory || !categoryTitle.trim()} className="gap-2">
                {savingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Criar categoria
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Enviar vídeo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label htmlFor="video-title">Título</Label><Input id="video-title" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="Título do vídeo" /></div>
              <div><Label>Categoria</Label><Select value={videoCategory} onValueChange={setVideoCategory}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="video-description">Descrição</Label><Textarea id="video-description" value={videoDescription} onChange={(e) => setVideoDescription(e.target.value)} placeholder="Resumo opcional" /></div>
              <div><Label htmlFor="tutorial-video-file">Arquivo de vídeo</Label><Input id="tutorial-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} /></div>
              <div className="flex items-center gap-3"><Switch checked={videoPublished} onCheckedChange={setVideoPublished} /><Label>Publicar imediatamente</Label></div>
              <Button onClick={uploadVideo} disabled={uploading || !videoFile || !videoTitle.trim() || !videoCategory} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? 'Enviando...' : 'Enviar vídeo'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {categories.length === 0 ? (
        <Card className="rounded-3xl"><CardContent className="flex flex-col items-center py-16 text-center"><Video className="mb-4 h-12 w-12 text-muted-foreground" /><h2 className="text-xl font-semibold">Nenhum vídeo publicado ainda</h2><p className="mt-2 text-muted-foreground">{isAdmin ? 'Crie a primeira categoria e envie um vídeo.' : 'Novos tutoriais serão adicionados em breve.'}</p></CardContent></Card>
      ) : (
        categories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-display text-2xl font-bold">{category.title}</h2>{category.description && <p className="mt-1 text-muted-foreground">{category.description}</p>}</div>
              {isAdmin && <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{category.is_published ? 'Categoria publicada' : 'Categoria oculta'}</span><Switch checked={category.is_published} onCheckedChange={() => toggleCategory(category)} /><Button variant="ghost" size="icon" onClick={() => deleteCategory(category)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}
            </div>

            {(videosByCategory.get(category.id) || []).length === 0 ? (
              isAdmin && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum vídeo nesta categoria.</div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {(videosByCategory.get(category.id) || []).map((video) => (
                  <Card key={video.id} className="overflow-hidden rounded-2xl">
                    <div className="aspect-video bg-black">{video.signed_url ? <video src={video.signed_url} controls preload="metadata" className="h-full w-full" /> : <div className="flex h-full items-center justify-center text-white/60"><Video className="h-10 w-10" /></div>}</div>
                    <CardContent className="space-y-3 p-5">
                      <div><h3 className="font-semibold">{video.title}</h3>{video.description && <p className="mt-1 text-sm text-muted-foreground">{video.description}</p>}</div>
                      {isAdmin && <div className="space-y-3 border-t pt-3"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{video.is_published ? 'Publicado' : 'Rascunho'}</span><Switch checked={video.is_published} onCheckedChange={() => toggleVideo(video)} /></div><div className="flex gap-2"><Select value={video.category_id} onValueChange={(value) => moveVideo(video, value)}><SelectTrigger className="h-9 flex-1"><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon" onClick={() => deleteVideo(video)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
