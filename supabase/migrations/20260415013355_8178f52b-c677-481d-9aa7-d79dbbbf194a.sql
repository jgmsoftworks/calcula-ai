-- Add UPDATE policy for produtos-fotos storage bucket
CREATE POLICY "Users can update their own product photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'produtos-fotos' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'produtos-fotos' AND auth.uid()::text = (storage.foldername(name))[1]);