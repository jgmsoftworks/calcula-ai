import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'rotulos-nutricionais';
export function validateNutritionPhoto(file: File): string | null {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Use uma imagem JPG, PNG ou WebP.';
  if (file.size > 8 * 1024 * 1024) return 'A foto deve ter até 8 MB.';
  return null;
}

export async function uploadNutritionPhoto(file: File): Promise<string> {
  const validation = validateNutritionPhoto(file);
  if (validation) throw new Error(validation);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Entre novamente para salvar a foto do rótulo.');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Não foi possível salvar a foto do rótulo. Tente novamente.');
  return path;
}

export async function nutritionPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeNutritionPhoto(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('Não foi possível remover a foto substituída do rótulo.');
}
