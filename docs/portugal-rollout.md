# Portugal: piloto técnico

Entrada: `https://calculaaibr.com/auth?mode=signup&trial=1&source=landing&country=PT&lang=pt-PT`.

## Comportamento

- As contas anteriores continuam em BRL, com planos, valores, dados e prazos preservados.
- O novo cadastro por email escolhe Brasil ou Portugal. O primeiro acesso de uma nova conta Google confirma país e moeda antes de permitir registos financeiros.
- Portugal usa EUR, formatos pt-PT, NIF/NIPC, código postal `0000-000`, telefone +351 e o fuso de Lisboa. Este piloto usa Lisboa como referência de horário.
- Idioma e moeda são independentes. A moeda fica fixa após a confirmação e não existe conversão cambial automática.
- O teste continua com 7 dias e limites do Iniciante. Pagamento confirmado converte a mesma conta em assinatura; expiração preserva dados.
- Os formatos de moeda foram centralizados para receitas, stock, custos, relatórios e exportações. Os identificadores internos e cabeçalhos necessários à importação mantêm os nomes anteriores.
- O fechamento mensal automático usa a meia-noite do país, considera o horário de verão de Lisboa e preserva snapshots já existentes. O cron verifica a cada hora e só processa o mercado cuja virada mensal chegou.

## Cobrança

Os planos de Portugal não têm preço inicial: não foi aplicada uma conversão dos preços em reais, nem criado qualquer preço ou cobrança em produção. Sem preço configurado, o botão de contratação permanece indisponível.

`plan_market_prices` guarda preços recorrentes EUR por plano e período, incluindo o histórico para reconhecer assinantes antigos. A função de checkout escolhe o mercado pelo perfil autenticado, verifica moeda, valor e período no Stripe e mantém o vínculo à mesma conta.

A área administrativa aceita um Stripe Price ativo, em EUR, do mesmo produto e período. Associar esse identificador libera aquele plano/período. Não associar antes de decidir os valores, o tratamento de IVA e as condições comerciais. Os descontos e as comissões de afiliados brasileiros não são aplicados às contas portuguesas.

Antes de anunciar vendas: definir os três preços em EUR e a oferta anual, validar IVA/faturação e termos/privacidade para o mercado de destino, conferir o portal de assinatura e realizar um pagamento e cancelamento no ambiente de testes. O conector Stripe disponível nesta sessão expõe apenas a área de testes; não houve pagamento real. A landing brasileira e as campanhas não são alteradas por esta entrega.

## Validação

- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`
- `npx vitest run --maxWorkers=4`
- `npx vitest run --config vitest.billing.config.ts`
- `PGLITE_MODULE=/tmp/calcula-region-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/portugal-database.mjs`
- Cadastro no Chromium em desktop e telemóvel com a chamada de inscrição interceptada: idioma, país, metadados de cadastro e ausência de erros de execução/overflow. Nenhuma conta real é criada por esse teste.

## Publicação e reversão

Aplicar a migração antes de publicar o frontend. Publicar as funções que importam `_shared/planos.ts` direta ou indiretamente, além de `admin-planos`, `affiliate-checkout` e `auto-fechamento-mensal`. Publicar o site pelo Lovable.

Para reverter o frontend, manter os campos e dados de região no banco. Não remover nem reclassificar contas EUR como BRL. Desativar preços de Portugal impede novas contratações sem apagar assinaturas ou o histórico dos preços.
