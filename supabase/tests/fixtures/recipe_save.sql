-- Isolated test database. Relevant production schema/functions captured 2026-11-03.
-- Auth/access lookup dependencies are simulated; no production data or credentials.
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION private.account_access(uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT jsonb_build_object('can_access',coalesce(nullif(current_setting('test.access',true),'')::boolean,true)) $$;
CREATE FUNCTION public.has_role_or_higher(text,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE TABLE public.profiles (user_id uuid PRIMARY KEY,plan text,access_mode text);
CREATE TABLE public.planos (slug text PRIMARY KEY,limites jsonb);
CREATE TABLE public.produtos (id uuid PRIMARY KEY,user_id uuid NOT NULL,custo_unitario numeric,unidade_uso text,fator_conversao numeric);
CREATE TABLE public.markups (id uuid PRIMARY KEY,user_id uuid NOT NULL,tipo text,markup_aplicado numeric);
CREATE TABLE public.tipos_produto (id uuid PRIMARY KEY,user_id uuid NOT NULL);
CREATE TABLE public.receitas (id uuid DEFAULT gen_random_uuid() NOT NULL,
user_id uuid NOT NULL,
nome text NOT NULL,
tempo_preparo_total integer DEFAULT 0,
tempo_preparo_mao_obra integer DEFAULT 0,
tipo_produto text,
rendimento_valor numeric,
rendimento_unidade text,
observacoes text,
status text DEFAULT 'finalizada'::text,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL,
markup_id uuid,
preco_venda numeric DEFAULT 0,
conservacao jsonb,
imagem_url text,
peso_unitario numeric,
numero_sequencial integer NOT NULL,
tipo_produto_id uuid,
tempo_preparo_unidade text DEFAULT 'minutos'::text);
CREATE TABLE public.receita_ingredientes (id uuid DEFAULT gen_random_uuid() NOT NULL,
receita_id uuid NOT NULL,
produto_id uuid NOT NULL,
quantidade numeric NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.receita_sub_receitas (id uuid DEFAULT gen_random_uuid() NOT NULL,
receita_id uuid NOT NULL,
sub_receita_id uuid NOT NULL,
quantidade numeric NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.receita_embalagens (id uuid DEFAULT gen_random_uuid() NOT NULL,
receita_id uuid NOT NULL,
produto_id uuid NOT NULL,
quantidade numeric NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.receita_passos_preparo (id uuid DEFAULT gen_random_uuid() NOT NULL,
receita_id uuid NOT NULL,
ordem integer NOT NULL,
descricao text NOT NULL,
imagem_url text,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL);
CREATE TABLE public.receita_mao_obra (id uuid DEFAULT gen_random_uuid() NOT NULL,
receita_id uuid NOT NULL,
funcionario_id uuid NOT NULL,
funcionario_nome text NOT NULL,
funcionario_cargo text NOT NULL,
custo_por_hora numeric NOT NULL,
tempo numeric NOT NULL,
unidade_tempo text DEFAULT 'minutos'::text,
valor_total numeric NOT NULL,
created_at timestamp with time zone DEFAULT now() NOT NULL,
updated_at timestamp with time zone DEFAULT now() NOT NULL);
ALTER TABLE public.receitas ADD CONSTRAINT receitas_markup_id_fkey FOREIGN KEY (markup_id) REFERENCES markups(id) ON DELETE SET NULL;
ALTER TABLE public.receitas ADD CONSTRAINT receitas_pkey PRIMARY KEY (id);
ALTER TABLE public.receitas ADD CONSTRAINT receitas_tipo_produto_id_fkey FOREIGN KEY (tipo_produto_id) REFERENCES tipos_produto(id) ON DELETE SET NULL;
ALTER TABLE public.receitas ADD CONSTRAINT unique_user_numero UNIQUE (user_id, numero_sequencial);
ALTER TABLE public.receita_ingredientes ADD CONSTRAINT receita_ingredientes_pkey PRIMARY KEY (id);
ALTER TABLE public.receita_ingredientes ADD CONSTRAINT receita_ingredientes_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.receita_ingredientes ADD CONSTRAINT receita_ingredientes_receita_id_fkey FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE;
ALTER TABLE public.receita_sub_receitas ADD CONSTRAINT receita_sub_receitas_pkey PRIMARY KEY (id);
ALTER TABLE public.receita_sub_receitas ADD CONSTRAINT receita_sub_receitas_receita_id_fkey FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE;
ALTER TABLE public.receita_sub_receitas ADD CONSTRAINT receita_sub_receitas_sub_receita_id_fkey FOREIGN KEY (sub_receita_id) REFERENCES receitas(id);
ALTER TABLE public.receita_embalagens ADD CONSTRAINT receita_embalagens_pkey PRIMARY KEY (id);
ALTER TABLE public.receita_embalagens ADD CONSTRAINT receita_embalagens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;
ALTER TABLE public.receita_embalagens ADD CONSTRAINT receita_embalagens_receita_id_fkey FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE;
ALTER TABLE public.receita_mao_obra ADD CONSTRAINT receita_mao_obra_pkey PRIMARY KEY (id);
ALTER TABLE public.receita_mao_obra ADD CONSTRAINT receita_mao_obra_receita_id_fkey FOREIGN KEY (receita_id) REFERENCES receitas(id) ON DELETE CASCADE;
ALTER TABLE public.receita_passos_preparo ADD CONSTRAINT receita_passos_preparo_pkey PRIMARY KEY (id);
CREATE OR REPLACE FUNCTION public.atribuir_numero_sequencial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proximo_numero INTEGER;
BEGIN
  -- Se já tem número, não mexe
  IF NEW.numero_sequencial IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar o próximo número disponível para este usuário
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1
  INTO proximo_numero
  FROM receitas
  WHERE user_id = NEW.user_id;

  -- Atribuir o número
  NEW.numero_sequencial := proximo_numero;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION private.can_use_app()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce((private.account_access(auth.uid())->>'can_access')::boolean, false);
$function$
;
CREATE OR REPLACE FUNCTION private.enforce_trial_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare plan_slug text; used integer; maximum integer; active_item boolean; old_active boolean;
begin
  if coalesce(public.has_role_or_higher('admin', auth.uid()),false) then return new; end if;
  select case when access_mode = 'trial' then 'lite' when plan = 'free' then 'lite' else plan end
    into plan_slug from public.profiles where user_id = new.user_id for update;
  if not coalesce((private.account_access(new.user_id)->>'can_access')::boolean,false) then
    raise exception 'Seu acesso terminou. Escolha um plano para continuar.' using errcode = '42501';
  end if;
  -- Branch explicitly: the real receitas table has neither ativo nor tipo.
  if tg_table_name = 'receitas' then active_item := true;
  elsif tg_table_name = 'markups' then active_item := new.ativo and coalesce(new.tipo,'normal') <> 'sub_receita';
  else active_item := new.ativo; end if;
  if not active_item then return new; end if;
  if tg_op = 'UPDATE' then
    if tg_table_name = 'receitas' then old_active := true;
    elsif tg_table_name = 'markups' then old_active := old.ativo and coalesce(old.tipo,'normal') <> 'sub_receita';
    else old_active := old.ativo; end if;
    if old.user_id = new.user_id and old_active then return new; end if;
  end if;
  select (limites->>tg_table_name)::integer into maximum from public.planos where slug = plan_slug;
  if maximum is null then
    select (limites->>tg_table_name)::integer into maximum from public.planos where slug = 'lite';
  end if;
  if maximum is null then raise exception 'Limite do plano indisponível'; end if;
  if maximum = -1 then return new; end if;
  if tg_table_name = 'receitas' then
    select count(*) into used from public.receitas where user_id = new.user_id and id <> new.id;
  elsif tg_table_name = 'produtos' then
    select count(*) into used from public.produtos where user_id = new.user_id and ativo and id <> new.id;
  else
    select count(*) into used from public.markups where user_id = new.user_id and ativo
      and coalesce(tipo,'normal') <> 'sub_receita' and id <> new.id;
  end if;
  if used + 1 > maximum then
    raise exception 'Você atingiu o limite do seu plano. Conheça os planos para continuar.'
      using errcode = '23514', detail = 'plan_limit_exceeded';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.atualizar_preco_receita(p_receita_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_markup_id UUID;
  v_markup_tipo TEXT;
  v_custo_total NUMERIC;
  v_novo_preco NUMERIC;
  v_markup_aplicado NUMERIC;
BEGIN
  -- Buscar markup da receita
  SELECT r.markup_id, m.tipo, m.markup_aplicado
  INTO v_markup_id, v_markup_tipo, v_markup_aplicado
  FROM receitas r
  LEFT JOIN markups m ON r.markup_id = m.id
  WHERE r.id = p_receita_id;

  -- SÓ ATUALIZAR AUTOMATICAMENTE SE FOR SUB-RECEITA
  -- Para markups normais, o preço definido pelo usuário é preservado
  IF v_markup_tipo != 'sub_receita' THEN
    RETURN; -- Não faz nada, preserva o preço manual
  END IF;

  -- Calcular custo total
  v_custo_total := calcular_custo_receita(p_receita_id);

  -- Sub-receitas: preço = custo
  v_novo_preco := v_custo_total;

  -- Atualizar preco_venda (só se houver diferença significativa)
  UPDATE receitas
  SET preco_venda = v_novo_preco,
      updated_at = now()
  WHERE id = p_receita_id
    AND ABS(COALESCE(preco_venda, 0) - v_novo_preco) > 0.01;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.calcular_custo_receita(p_receita_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  custo_ingredientes NUMERIC := 0;
  custo_embalagens NUMERIC := 0;
  custo_mao_obra NUMERIC := 0;
  custo_sub_receitas NUMERIC := 0;
BEGIN
  -- Calcular custo ingredientes
  SELECT COALESCE(SUM(
    CASE
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao > 0
      THEN (p.custo_unitario / p.fator_conversao) * ri.quantidade
      ELSE p.custo_unitario * ri.quantidade
    END
  ), 0) INTO custo_ingredientes
  FROM receita_ingredientes ri
  JOIN produtos p ON ri.produto_id = p.id
  WHERE ri.receita_id = p_receita_id;

  -- Calcular custo embalagens
  SELECT COALESCE(SUM(
    CASE
      WHEN p.unidade_uso IS NOT NULL AND p.fator_conversao > 0
      THEN (p.custo_unitario / p.fator_conversao) * re.quantidade
      ELSE p.custo_unitario * re.quantidade
    END
  ), 0) INTO custo_embalagens
  FROM receita_embalagens re
  JOIN produtos p ON re.produto_id = p.id
  WHERE re.receita_id = p_receita_id;

  -- Calcular custo mão de obra
  SELECT COALESCE(SUM(valor_total), 0) INTO custo_mao_obra
  FROM receita_mao_obra
  WHERE receita_id = p_receita_id;

  -- Calcular custo sub-receitas
  SELECT COALESCE(SUM(
    CASE
      WHEN r.rendimento_valor > 0
      THEN (r.preco_venda / r.rendimento_valor) * rs.quantidade
      ELSE r.preco_venda * rs.quantidade
    END
  ), 0) INTO custo_sub_receitas
  FROM receita_sub_receitas rs
  JOIN receitas r ON rs.sub_receita_id = r.id
  WHERE rs.receita_id = p_receita_id;

  RETURN custo_ingredientes + custo_embalagens + custo_mao_obra + custo_sub_receitas;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_componente_receita_modificado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM atualizar_preco_receita(OLD.receita_id);
    RETURN OLD;
  ELSE
    PERFORM atualizar_preco_receita(NEW.receita_id);
    RETURN NEW;
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.trigger_receita_preco_atualizado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  receita_record RECORD;
BEGIN
  -- Só executar se preco_venda mudou significativamente
  IF ABS(COALESCE(OLD.preco_venda, 0) - COALESCE(NEW.preco_venda, 0)) <= 0.01 THEN
    RETURN NEW;
  END IF;

  -- Atualizar receitas que usam esta receita como sub-receita
  FOR receita_record IN
    SELECT DISTINCT receita_id FROM receita_sub_receitas WHERE sub_receita_id = NEW.id
  LOOP
    PERFORM atualizar_preco_receita(receita_record.receita_id);
  END LOOP;

  RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;
CREATE TRIGGER trigger_atribuir_numero_sequencial BEFORE INSERT ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.atribuir_numero_sequencial();
CREATE TRIGGER enforce_trial_limits BEFORE INSERT OR UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION private.enforce_trial_limits();
CREATE TRIGGER after_receita_preco_update AFTER UPDATE OF preco_venda ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.trigger_receita_preco_atualizado();
CREATE FUNCTION public.test_component_failure() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME=current_setting('test.fail_table',true) THEN RAISE EXCEPTION 'Injected late failure' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receitas FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY access ON public.receitas AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receita_ingredientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receita_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receita_ingredientes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_ingredientes.receita_id AND r.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_ingredientes.receita_id AND r.user_id=auth.uid()));
CREATE POLICY access ON public.receita_ingredientes AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER fail_test AFTER INSERT OR UPDATE OR DELETE ON public.receita_ingredientes FOR EACH ROW EXECUTE FUNCTION public.test_component_failure();
CREATE TRIGGER component_change AFTER INSERT OR UPDATE OR DELETE ON public.receita_ingredientes FOR EACH ROW EXECUTE FUNCTION public.trigger_componente_receita_modificado();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receita_sub_receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receita_sub_receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receita_sub_receitas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_sub_receitas.receita_id AND r.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_sub_receitas.receita_id AND r.user_id=auth.uid()));
CREATE POLICY access ON public.receita_sub_receitas AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER fail_test AFTER INSERT OR UPDATE OR DELETE ON public.receita_sub_receitas FOR EACH ROW EXECUTE FUNCTION public.test_component_failure();
CREATE TRIGGER component_change AFTER INSERT OR UPDATE OR DELETE ON public.receita_sub_receitas FOR EACH ROW EXECUTE FUNCTION public.trigger_componente_receita_modificado();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receita_embalagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receita_embalagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receita_embalagens FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_embalagens.receita_id AND r.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_embalagens.receita_id AND r.user_id=auth.uid()));
CREATE POLICY access ON public.receita_embalagens AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER fail_test AFTER INSERT OR UPDATE OR DELETE ON public.receita_embalagens FOR EACH ROW EXECUTE FUNCTION public.test_component_failure();
CREATE TRIGGER component_change AFTER INSERT OR UPDATE OR DELETE ON public.receita_embalagens FOR EACH ROW EXECUTE FUNCTION public.trigger_componente_receita_modificado();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receita_passos_preparo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receita_passos_preparo ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receita_passos_preparo FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_passos_preparo.receita_id AND r.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_passos_preparo.receita_id AND r.user_id=auth.uid()));
CREATE POLICY access ON public.receita_passos_preparo AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER fail_test AFTER INSERT OR UPDATE OR DELETE ON public.receita_passos_preparo FOR EACH ROW EXECUTE FUNCTION public.test_component_failure();
CREATE TRIGGER update_timestamp BEFORE UPDATE ON public.receita_mao_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.receita_mao_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner ON public.receita_mao_obra FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_mao_obra.receita_id AND r.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.receitas r WHERE r.id=receita_mao_obra.receita_id AND r.user_id=auth.uid()));
CREATE POLICY access ON public.receita_mao_obra AS RESTRICTIVE FOR ALL TO authenticated USING (private.can_use_app()) WITH CHECK (private.can_use_app());
CREATE TRIGGER fail_test AFTER INSERT OR UPDATE OR DELETE ON public.receita_mao_obra FOR EACH ROW EXECUTE FUNCTION public.test_component_failure();
CREATE TRIGGER component_change AFTER INSERT OR UPDATE OR DELETE ON public.receita_mao_obra FOR EACH ROW EXECUTE FUNCTION public.trigger_componente_receita_modificado();
GRANT USAGE ON SCHEMA public,auth,private TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
