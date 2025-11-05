-- Criar bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('produtos-fotos', 'produtos-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: usuário pode fazer upload das próprias fotos
CREATE POLICY "Users can upload own product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'produtos-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: todos podem ver fotos (bucket é público)
CREATE POLICY "Public can view product photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'produtos-fotos');

-- RLS: usuário pode deletar apenas suas próprias fotos
CREATE POLICY "Users can delete own product photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'produtos-fotos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);