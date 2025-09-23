-- Adicionar foreign keys para estabelecer as relações
ALTER TABLE public.estoque_receitas 
ADD CONSTRAINT fk_estoque_receitas_receita 
FOREIGN KEY (receita_id) REFERENCES public.receitas(id) ON DELETE CASCADE;

ALTER TABLE public.movimentacoes_receitas 
ADD CONSTRAINT fk_movimentacoes_receitas_receita 
FOREIGN KEY (receita_id) REFERENCES public.receitas(id) ON DELETE CASCADE;