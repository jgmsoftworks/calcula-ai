-- Adicionar campos completos para informações empresariais na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cnpj_cpf VARCHAR(18);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20);

-- Endereço completo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS numero VARCHAR(10);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pais VARCHAR(50) DEFAULT 'Brasil';

-- Contatos e comunicação
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone_comercial VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_comercial VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- Informações empresariais adicionais
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setor_atividade TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS descricao_empresa TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_abertura DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(50);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS porte_empresa VARCHAR(20);

-- Responsável/Contato principal
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsavel_nome TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsavel_cargo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsavel_cpf VARCHAR(14);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(255);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(20);

-- Configurações adicionais
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_empresa_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cor_primaria VARCHAR(7);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cor_secundaria VARCHAR(7);

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.cnpj_cpf IS 'CNPJ para empresas ou CPF para MEI/autônomos';
COMMENT ON COLUMN public.profiles.regime_tributario IS 'Simples Nacional, Lucro Presumido, Lucro Real, MEI, etc.';
COMMENT ON COLUMN public.profiles.porte_empresa IS 'MEI, Micro, Pequena, Média, Grande';
COMMENT ON COLUMN public.profiles.setor_atividade IS 'Setor de atividade da empresa (alimentação, varejo, serviços, etc.)';

-- Criar índices para campos frequentemente consultados
CREATE INDEX IF NOT EXISTS idx_profiles_cnpj_cpf ON public.profiles(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_cidade ON public.profiles(cidade);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON public.profiles(estado);