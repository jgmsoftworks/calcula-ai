# Planos anuais para Lite, Profissional e Empresarial

## Valores definidos

Cobrança anual = 12x o valor mensal, sem desconto:

- Lite: R$ 9,90/mês → R$ 118,80/ano
- Profissional: R$ 29,90/mês → R$ 358,80/ano
- Empresarial: R$ 49,90/mês → R$ 598,80/ano

## O que será feito

### 1. Stripe (conta PJ live)

- Criar um preço anual recorrente (interval = year) em cada um dos três produtos já existentes (Lite, Profissional, Empresarial). Nenhum preço mensal atual é alterado, arquivado ou cancelado.
- Criar três novos Payment Links anuais, ativos, para uso no painel do Master ADM e nos afiliados. Os links mensais continuam como estão.

### 2. Banco de dados

- Novas colunas em `public.planos`: `preco_anual_centavos`, `stripe_price_id_anual`, `versao_preco_anual`.
- Preencher com os valores acima e com os Price IDs criados na Stripe.
- Registrar as faixas anuais em `planos_precos_historico` (mesma lógica de vigência já usada nos mensais), para que assinaturas futuras em preço legado continuem reconhecidas.
- Inserir as três novas linhas `yearly` em `payment_links` com as URLs dos Payment Links anuais.

### 3. Checkout e assinaturas

- `create-checkout` e `affiliate-checkout` passam a escolher o Price mensal ou anual conforme o parâmetro `billing` já recebido (hoje ele é ignorado e sempre usa o mensal).
- `check-subscription`, `stripe-webhook` e a resolução de plano por price/product passam a reconhecer também os Price IDs anuais, mapeando-os para o mesmo plano.
- Nenhuma assinatura existente é migrada ou alterada.

### 4. Telas

- Alternador **Mensal / Anual** no topo da tela de Planos; os três cards mostram o preço do período selecionado (`R$ X/mês` ou `R$ X/ano`) e o botão de assinar envia o período escolhido.
- Mesmo alternador no modal de upgrade e na tela do afiliado, para manter tudo consistente.
- Tela de checkout mostra o período escolhido no resumo.
- No Master ADM, a central de planos passa a exibir e permitir editar também o valor anual, criando o novo Price na Stripe pelo mesmo fluxo seguro já existente (só grava no banco se a Stripe confirmar).

## Detalhes técnicos

- Helpers em `supabase/functions/_shared/planos.ts` ganham resolução por período: `getPlano(slug)` passa a expor os dois price IDs e uma função auxiliar escolhe o correto conforme `billing`.
- `slugFromStripe` continua funcionando: os price IDs anuais entram tanto em `planos` quanto no histórico.
- Frontend: `usePlanos` expõe os campos anuais; `useStripe.createCheckout` já aceita `billing` e passa a propagá-lo de verdade.
- Grants e RLS de `planos` e `payment_links` permanecem como estão (leitura pública apenas de registros ativos).

## Fora de escopo

Nenhuma migração de assinantes mensais para anual, e nenhum desconto promocional — isso pode ser feito depois, se você quiser.
