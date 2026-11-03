# Indicadores financeiros administrativos

O dashboard principal e a aba Dashboard do Painel Stripe consultam `stripe-admin-dashboard`. Perfis, preços do catálogo, afiliados e logins não alimentam indicadores financeiros. A função verifica JWT e o papel administrativo no banco antes de consultar Stripe. Nenhuma cobrança, assinatura, acesso de usuário ou webhook é alterado por esta consulta.

## Definições

- **MRR adimplente:** valor recorrente contratado, líquido dos descontos recorrentes, de assinaturas `active` com fatura atual quitada e pagamento anterior positivo conciliado com cobrança capturada. Testes, concessões de acesso, `past_due`, cobrança pausada, faturas manuais sem comprovação e faturas atuais totalmente reembolsadas ficam fora. Anual / 12; trimestral / 3; quantidade e intervalo reais do contrato. Descontos pontuais afetam recebimentos, não o run rate. Esta convenção é mais conservadora que o MRR padrão Stripe, que inclui `past_due`.
- **Clientes pagantes:** clientes Stripe distintos, por conta e moeda, com os contratos acima. Não são contagens de perfis ou de assinaturas. Contas atual e legada permanecem separadas para não presumir equivalência de identidades.
- **ARR:** 12 vezes o MRR antes do arredondamento de exibição. É projeção, não caixa.
- **ARPU:** MRR / clientes pagantes. Sem base pagante, indisponível.
- **Churn da base, 30 dias:** clientes pagantes que estavam na base inicial e estão sem contrato `active`/`past_due` ao final / base inicial. Reconstrói o estado inicial a partir das mudanças reais do Stripe e da primeira fatura com pagamento confirmado. Novos clientes no período não entram no denominador. Cancelamento agendado e atraso isolado não são churn; perder apenas uma entre várias assinaturas também não. Reativados até o final são retidos nesta medida de coorte (não é churn bruto de eventos).
- **LTV de receita estimado:** ARPU / fração de churn de 30 dias. Sem ARPU, sem base, com churn zero ou histórico ambíguo, indisponível. Não estima margem, nem usa MRR total ou vida útil arbitrária.
- **Recebimentos:** cobranças capturadas, na data de sua movimentação de saldo, incluindo avulsas. Reembolsos concluídos são deduzidos no mês de sua própria movimentação, inclusive para cobranças antigas. Antes de taxas, impostos e disputas; não são lucro, repasses bancários, receita contábil reconhecida ou MRR histórico. Anual entra integralmente no caixa.

Datas e meses financeiros usam UTC. Moedas nunca são somadas ou convertidas sem câmbio. Valores monetários são arredondados somente na saída. Os campos BRL antigos são mantidos temporariamente para clientes já abertos durante a publicação.

## Integridade e limites

Todas as páginas de assinaturas, faturas, vínculos de pagamentos, cobranças, reembolsos e eventos são lidas. Uma coleção incompleta ou indisponível invalida o relatório; falha apenas nos eventos invalida churn/LTV. A leitura tem um limite explícito de 10 mil objetos por coleção: ultrapassá-lo produz indisponibilidade, nunca um total parcial. Em escala maior, substituir por ingestão persistida e reconciliação incremental.

Somente produção (`livemode=true`). Modo de teste é recusado. Planos com preços em faixas, imposto embutido, desconto não expandido, mistura de intervalos com desconto fixo ou outros formatos não suportados deixam MRR/ARR/ARPU indisponíveis com motivo. Não há fallback para preço do perfil.

A API Stripe disponibiliza eventos detalhados por 30 dias. Histórico ambíguo, como somente um evento de exclusão sem estado anterior, não permite afirmar a base inicial: churn/LTV ficam indisponíveis. Para séries históricas de churn além dessa janela, será necessário persistir os eventos e reconciliar snapshots; esta entrega não inventa esse histórico.

A conta legada só é consultada quando habilitada e configurada. Ausência da conta legada ou de pagamentos externos fica explícita na tela; o painel não afirma receita consolidada de fontes inacessíveis. Receita, CAC, ROAS e LTV por canal permanecem indisponíveis enquanto não houver conciliação de pagamento, atribuição e custos. Contadores de links continuam visíveis.

## Validação

Testes em `src/lib/__tests__/adminFinancialMetrics.test.ts`, `src/hooks/__tests__/useAdminDashboardMetrics.test.tsx` e `src/components/admin/__tests__/AdminFinancialPanel.test.tsx` verificam filtros de pagamento, exemplo 3 × R$29,90, anual/descontos/quantidade/intervalos, coortes, múltiplas assinaturas, inadimplência, cancelamento efetivo, moedas, reembolsos, paginação e estados indisponíveis. O teste do dashboard do cliente permanece como regressão.

Referências: https://docs.stripe.com/billing/subscriptions/analytics ; https://docs.stripe.com/api/events/list ; https://docs.stripe.com/api/invoice-payment ; https://docs.stripe.com/api/balance_transactions/object .
