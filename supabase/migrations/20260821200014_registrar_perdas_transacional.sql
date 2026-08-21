create or replace function public.registrar_perdas_transacional(
  p_itens jsonb,
  p_motivo text,
  p_motivo_outro text default null,
  p_observacao text default null,
  p_responsavel text default null,
  p_baixar_estoque boolean default false
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item record;
  v_produto record;
  v_quantidade_baixa numeric;
  v_custo_unitario numeric;
  v_total_itens integer;
begin
  if v_user_id is null then
    raise exception using message = 'Usuário não autenticado.';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception using message = 'Adicione ao menos um item à perda.';
  end if;

  if nullif(btrim(p_motivo), '') is null then
    raise exception using message = 'Informe o motivo da perda.';
  end if;

  if p_motivo = 'Outro' and nullif(btrim(p_motivo_outro), '') is null then
    raise exception using message = 'Descreva o motivo da perda.';
  end if;

  create temporary table if not exists pg_temp.perdas_itens_processados (
    ordem bigint,
    tipo text,
    item_id uuid,
    nome_item text,
    quantidade numeric,
    custo_unitario numeric
  ) on commit drop;
  truncate pg_temp.perdas_itens_processados;

  insert into pg_temp.perdas_itens_processados (
    ordem, tipo, item_id, nome_item, quantidade, custo_unitario
  )
  select
    item.ordinalidade,
    item.tipo,
    item.item_id,
    case
      when item.tipo = 'produto' then produto.nome
      when item.tipo = 'receita' then receita.nome
    end,
    item.quantidade,
    case
      when item.tipo = 'produto' then produto.custo_unitario
      when item.tipo = 'receita' then
        public.calcular_custo_receita(receita.id)
        / case
            when coalesce(receita.rendimento_valor, 0) > 0 then receita.rendimento_valor
            else 1
          end
    end
  from rows from (
    jsonb_to_recordset(p_itens) as (tipo text, item_id uuid, quantidade numeric)
  ) with ordinality as item(tipo, item_id, quantidade, ordinalidade)
  left join public.produtos produto
    on item.tipo = 'produto'
   and produto.id = item.item_id
   and produto.user_id = v_user_id
  left join public.receitas receita
    on item.tipo = 'receita'
   and receita.id = item.item_id
   and receita.user_id = v_user_id;

  select count(*) into v_total_itens
  from pg_temp.perdas_itens_processados;

  if v_total_itens <> jsonb_array_length(p_itens) then
    raise exception using message = 'Um ou mais itens da perda são inválidos.';
  end if;

  if exists (
    select 1
    from pg_temp.perdas_itens_processados
    where tipo not in ('produto', 'receita')
       or item_id is null
       or quantidade is null
       or quantidade <= 0
       or nome_item is null
  ) then
    raise exception using message = 'Um ou mais itens da perda são inválidos.';
  end if;

  if exists (
    select 1
    from pg_temp.perdas_itens_processados item
    join public.receita_ingredientes ingrediente
      on item.tipo = 'receita'
     and ingrediente.receita_id = item.item_id
    left join public.produtos produto
      on produto.id = ingrediente.produto_id
     and produto.user_id = v_user_id
    where produto.id is null
  ) then
    raise exception using message = 'A receita possui um ingrediente inválido ou sem acesso.';
  end if;

  if p_baixar_estoque then
    create temporary table if not exists pg_temp.perdas_baixas_estoque (
      produto_id uuid primary key,
      quantidade numeric
    ) on commit drop;
    truncate pg_temp.perdas_baixas_estoque;

    if exists (
      select 1
      from pg_temp.perdas_itens_processados item
      where item.tipo = 'produto'
        and round(item.quantidade, 3) <= 0
    ) or exists (
      select 1
      from pg_temp.perdas_itens_processados item
      join public.receita_ingredientes ingrediente
        on item.tipo = 'receita'
       and ingrediente.receita_id = item.item_id
      join public.produtos produto
        on produto.id = ingrediente.produto_id
       and produto.user_id = v_user_id
      where round(
        case
          when produto.unidade_uso is not null
           and produto.fator_conversao is not null
           and produto.fator_conversao > 0
            then (ingrediente.quantidade * item.quantidade) / produto.fator_conversao
          else ingrediente.quantidade * item.quantidade
        end,
        3
      ) <= 0
    ) then
      raise exception using message = 'A quantidade é pequena demais para movimentar o estoque.';
    end if;

    insert into pg_temp.perdas_baixas_estoque (produto_id, quantidade)
    select demanda.produto_id, sum(round(demanda.quantidade, 3))
    from (
      select item.item_id as produto_id, item.quantidade
      from pg_temp.perdas_itens_processados item
      where item.tipo = 'produto'

      union all

      select
        ingrediente.produto_id,
        case
          when produto.unidade_uso is not null
           and produto.fator_conversao is not null
           and produto.fator_conversao > 0
            then (ingrediente.quantidade * item.quantidade) / produto.fator_conversao
          else ingrediente.quantidade * item.quantidade
        end
      from pg_temp.perdas_itens_processados item
      join public.receita_ingredientes ingrediente
        on item.tipo = 'receita'
       and ingrediente.receita_id = item.item_id
      join public.produtos produto
        on produto.id = ingrediente.produto_id
       and produto.user_id = v_user_id
    ) demanda
    group by demanda.produto_id;

    -- O bloqueio impede duas baixas simultâneas de consumirem o mesmo saldo.
    perform 1
    from public.produtos produto
    join pg_temp.perdas_baixas_estoque baixa on baixa.produto_id = produto.id
    where produto.user_id = v_user_id
    order by produto.id
    for update of produto;

    if exists (
      select 1
      from pg_temp.perdas_baixas_estoque baixa
      left join public.produtos produto
        on produto.id = baixa.produto_id
       and produto.user_id = v_user_id
      where produto.id is null
    ) then
      raise exception using message = 'Um dos produtos do estoque não foi encontrado.';
    end if;

    select
      produto.nome,
      produto.estoque_atual,
      baixa.quantidade
    into v_produto
    from pg_temp.perdas_baixas_estoque baixa
    join public.produtos produto on produto.id = baixa.produto_id
    where produto.estoque_atual < baixa.quantidade
    order by produto.nome
    limit 1;

    if found then
      raise exception using message = format(
        'Estoque insuficiente de %s. Disponível: %s; necessário: %s.',
        v_produto.nome,
        v_produto.estoque_atual,
        round(v_produto.quantidade, 4)
      );
    end if;
  end if;

  for v_item in
    select * from pg_temp.perdas_itens_processados order by ordem
  loop
    insert into public.perdas (
      user_id,
      tipo,
      produto_id,
      receita_id,
      nome_item,
      quantidade,
      custo_unitario,
      custo_total,
      motivo,
      motivo_outro,
      observacao,
      responsavel,
      data_perda
    ) values (
      v_user_id,
      v_item.tipo,
      case when v_item.tipo = 'produto' then v_item.item_id end,
      case when v_item.tipo = 'receita' then v_item.item_id end,
      v_item.nome_item,
      v_item.quantidade,
      coalesce(v_item.custo_unitario, 0),
      round(v_item.quantidade * coalesce(v_item.custo_unitario, 0), 2),
      p_motivo,
      case when p_motivo = 'Outro' then nullif(btrim(p_motivo_outro), '') end,
      nullif(btrim(p_observacao), ''),
      nullif(btrim(p_responsavel), ''),
      now()
    );

    if p_baixar_estoque and v_item.tipo = 'produto' then
      insert into public.movimentacoes (
        user_id, produto_id, tipo, motivo, quantidade, custo_aplicado,
        subtotal, responsavel, origem, data_hora
      ) values (
        v_user_id, v_item.item_id, 'saida', 'Perda - ' || p_motivo,
        round(v_item.quantidade, 3), coalesce(v_item.custo_unitario, 0),
        round(v_item.quantidade * coalesce(v_item.custo_unitario, 0), 2),
        coalesce(nullif(btrim(p_responsavel), ''), 'Sistema'), 'perdas', now()
      );
    elsif p_baixar_estoque and v_item.tipo = 'receita' then
      for v_produto in
        select
          produto.id,
          produto.custo_unitario,
          case
            when produto.unidade_uso is not null
             and produto.fator_conversao is not null
             and produto.fator_conversao > 0
              then (ingrediente.quantidade * v_item.quantidade) / produto.fator_conversao
            else ingrediente.quantidade * v_item.quantidade
          end as quantidade
        from public.receita_ingredientes ingrediente
        join public.produtos produto
          on produto.id = ingrediente.produto_id
         and produto.user_id = v_user_id
        where ingrediente.receita_id = v_item.item_id
      loop
        v_quantidade_baixa := round(v_produto.quantidade, 3);
        v_custo_unitario := coalesce(v_produto.custo_unitario, 0);

        insert into public.movimentacoes (
          user_id, produto_id, tipo, motivo, quantidade, custo_aplicado,
          subtotal, responsavel, origem, data_hora
        ) values (
          v_user_id, v_produto.id, 'saida', 'Perda Receita - ' || p_motivo,
          v_quantidade_baixa, v_custo_unitario,
          round(v_quantidade_baixa * v_custo_unitario, 2),
          coalesce(nullif(btrim(p_responsavel), ''), 'Sistema'), 'perdas', now()
        );
      end loop;
    end if;
  end loop;

  if p_baixar_estoque then
    update public.produtos produto
    set estoque_atual = produto.estoque_atual - baixa.quantidade
    from pg_temp.perdas_baixas_estoque baixa
    where produto.id = baixa.produto_id
      and produto.user_id = v_user_id;
  end if;

  return v_total_itens;
end;
$$;

revoke all on function public.registrar_perdas_transacional(jsonb, text, text, text, text, boolean)
  from public, anon;
grant execute on function public.registrar_perdas_transacional(jsonb, text, text, text, text, boolean)
  to authenticated;

comment on function public.registrar_perdas_transacional(jsonb, text, text, text, text, boolean)
  is 'Registra perdas em lote e, quando solicitado, valida e baixa o estoque atomicamente sem permitir saldo negativo.';
