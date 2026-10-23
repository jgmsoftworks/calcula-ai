# Aquisição com teste de 7 dias

Landing e apresentação → /auth?mode=signup&trial=1&source=landing → conta gratuita → primeira receita → /planos → checkout autenticado → pagamento confirmado → mesma conta liberada.

O teste tem os limites do Iniciante: 30 matérias-primas, 5 receitas, 1 markup e zero exportações PDF. Sem cartão no cadastro e sem cobrança automática no fim. Expiração restringe recursos e preserva dados. Interesse em um plano maior na landing não muda os recursos do teste.

## Medição

GA4, somente com consentimento de métricas: landing_view, trial_cta_click, signup_started, signup_completed (cadastro por e-mail), recipe_created, first_recipe_created, plans_view, plan_selected, checkout_started e purchase (pagamento verificado no servidor). UTMs são encaminhadas ao cadastro e aos eventos do aplicativo. Não são enviados nomes, e-mails nem conteúdo de receitas.

first_recipe_created exige receita de sequência 1 salva integralmente; deduplicação local por conta. Não é contagem financeira nem garante unicidade entre dispositivos, limpeza de armazenamento ou exclusão de receitas. plans_view conta aberturas da tela. O painel de jornadas da landing continua separado; estes eventos novos não foram adicionados a ele. Não há medição de cadastro Google concluído nesta alteração; o clique inicial não deve ser confundido com conta criada. Purchase do navegador não substitui o registro de pagamentos do servidor.

## Próximo teste de anúncios (preparado, não ativado)

Mesma landing, mesma oferta, três mensagens. Links usam utm_source=meta, utm_medium=paid_social e utm_campaign=teste_7dias. Variar utm_content entre custo_receita, preco_venda e demonstracao. Comparar custo por cadastro, proporção que salva a primeira receita e assinaturas pagas; três leads isolados não identificam qual etapa falhou.

- custo_receita: “Quanto custa de verdade a sua receita? Some ingredientes e custos na Calcula Aí. Experimente grátis por 7 dias.” Mostrar o cálculo de uma receita real, sem inventar economia.
- preco_venda: “Seu preço cobre os custos? Confira antes da próxima encomenda. Teste a Calcula Aí por 7 dias.” Mostrar custo e formação de preço, sem prometer lucro.
- demonstracao: “Do ingrediente ao preço de venda: veja uma receita sendo calculada.” Gravação curta do produto, encerrando no botão de teste.

Destino: https://calculaivendas.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=teste_7dias&utm_content=custo_receita (substituir só utm_content nos demais).

Antes de investir: concluir uma entrada Google com conta controlada, validar um pagamento ponta a ponta e definir orçamento. Nenhuma campanha ou gasto foi ativado por esta alteração.
