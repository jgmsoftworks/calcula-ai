import { supabase } from '@/integrations/supabase/client';

export async function uploadCatalogoFoto(userId: string, pasta: 'tipos-produto' | 'marcas' | 'categorias', imagem: string | null | undefined): Promise<string | null> {
  let imagem_url = imagem ?? null;
  if (imagem_url?.startsWith('data:')) {
    if (!imagem_url.startsWith('data:image/jpeg;base64,')) throw new Error('Ajuste a foto antes de salvar.');
    const bytes = Uint8Array.from(atob(imagem_url.split(',')[1]), char => char.charCodeAt(0));
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('A foto deve ter até 5 MB.');
    const path = `${userId}/${pasta}/${crypto.randomUUID()}.jpg`;
    const storage = supabase.storage.from('receitas-images');
    const { error } = await storage.upload(path, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    imagem_url = storage.getPublicUrl(path).data.publicUrl;
  }
  return imagem_url;
}
