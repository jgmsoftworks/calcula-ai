-- Criar bucket para logos de empresas
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-empresas', 'logos-empresas', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública
CREATE POLICY "Logos são públicos para visualização"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos-empresas');

-- Política para upload pelo próprio usuário
CREATE POLICY "Usuários podem fazer upload de seus logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos-empresas' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para atualizar próprio logo
CREATE POLICY "Usuários podem atualizar seus logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos-empresas' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para deletar próprio logo
CREATE POLICY "Usuários podem deletar seus logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos-empresas' AND auth.uid()::text = (storage.foldername(name))[1]);