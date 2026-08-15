# Migrar pagamentos para a conta PJ (live) com os valores novos

## Diagnóstico (verificado agora)

- Os produtos/preços novos existem, mas foram criados em **modo teste** da conta `acct_1SAB92BnxFLGYBYf` (`livemode: false`). Por isso não aparecem no painel Stripe ao vivo.
  - Lite R$ 9,90 — `price_1U4hB5BnxFLGYBYfYT8G21xY`
  - Profissional R$ 29,90 — `price_1U4hBPBnxFLGYBYfDTZkdigL`
  - Empresarial R$ 49,90 — `price_1U4hBUBnxFLGYBYfFyA5pqbN`
- A tabela `payment_links` (fonte usada pelo painel ADM em Admin → Stripe) ainda contém **apenas os 4 links antigos**, de outra conta (prefixo `BgdnRO3nnJ`, conta CPF), com valores antigos e ciclos mensal/anual. É por isso que ao clicar nos links do ADM cai em preço velho.
- `src/hooks/useStripe.tsx` ainda tem 4 URLs `buy.stripe.com` antigas hardcoded como fallback.
- Não existe nenhum Payment Link criado para os preços novos.

## O que será feito

### 1. Trocar a chave Stripe para a conta PJ (live)
Você me envia a chave secreta live (`sk_live_...`) da conta PJ; ela é gravada como segredo `STRIPE_SECRET_KEY` (nunca no código). Sem esse passo nada em produção funciona.

### 2. Recriar produtos e preços em live na conta PJ
Três produtos com preço mensal recorrente em BRL:

| Plano | Valor mensal |
|---|---|
| Calcula Aí — Lite | R$ 9,90 |
| Calcula Aí — Profissional | R$ 29,90 |
| Calcula Aí — Empresarial | R$ 49,90 |

Nada é apagado na conta antiga: assinantes atuais continuam no preço legado.

### 3. Criar os Payment Links fixos (buy.stripe.com)
Um link por plano, com cobrança recorrente mensal e redirecionamento para `/auth/success` do sistema. São esses links que você poderá divulgar em WhatsApp/Instagram — eu devolvo as 3 URLs no chat ao final.

### 4. Atualizar o banco
- `planos`: gravar os novos `stripe_product_id` / `stripe_price_id` live, mantendo o histórico em `planos_precos_historico` (grandfathering preservado).
- `payment_links`: inserir as 3 linhas novas (lite/professional/enterprise, mensal) e **desativar** as 4 antigas (inclusive as anuais), já que só teremos mensal.

### 5. Limpar valores hardcoded
- `src/hooks/useStripe.tsx`: remover as URLs `buy.stripe.com` antigas do fallback; passar a ler exclusivamente `payment_links`.
- `supabase/functions/create-checkout/index.ts` e `affiliate-checkout/index.ts`: remover os price IDs antigos de fallback (`BgdnRO3nnJ...` / `1SA...`), deixando a tabela `planos` como única fonte.
- `src/pages/AdminStripe.tsx`: continuar editando `payment_links`, agora com Lite incluído e sem coluna anual ativa.

### 6. Conferência
Abrir cada um dos 3 links e confirmar que o valor exibido no Stripe é 9,90 / 29,90 / 49,90, e testar o botão de assinatura dentro do app apontando para o mesmo preço.

## Observações técnicas

- Cupons de afiliado e `affiliate_stripe_products` apontam para a conta antiga; se você usa cupons hoje, eles precisarão ser recriados na conta PJ (posso fazer depois, em uma etapa separada).
- O webhook do Stripe (`stripe-webhook`) precisará ser recadastrado na conta PJ live com o mesmo endpoint e o segredo atualizado.
