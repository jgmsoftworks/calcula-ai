# Integração com Anota AI — etapa 1 (conectar e validar)

Fonte consultada em 16/11/2026:
- [Documentação oficial](https://integ-public-platform-docs.anota.ai/)
- [OAuth client_credentials](https://integ-public-platform-docs.anota.ai/docs/integracao-parceiros/oauth-api)
- [API de vínculo por chave de loja](https://integ-public-platform-docs.anota.ai/docs/integracao-parceiros/integration-partner-endpoints)
- [Pedidos v2 e escopo x-page-id](https://integ-public-platform-docs.anota.ai/docs/integracao-parceiros/api-pedidos-v2)

## Acesso à integração

1. A Calcula Aí cadastra **uma única conta integradora** no portal
   https://integracao.anota.ai/signer.
2. Obtém CLIENT ID e CLIENT SECRET no perfil da conta integradora.
3. Configura **apenas no ambiente da Edge Function**:
   `ANOTA_AI_CLIENT_ID`, `ANOTA_AI_CLIENT_SECRET`.
4. Cada lojista busca **ID da loja** (idpage, ObjectId de 24 caracteres)
   e **Chave de integração** no admin Anota AI > Configurações > Integrações.
5. A Calcula Aí chama `linkpage-by-token` com a chave e o OAuth de parceiro,
   valida leitura com `GET /api-old/partnerauth/v2/ping/list` e guarda apenas
   o vínculo do proprietário e o ID da loja.

Não compartilhar chaves em issues, chats, screenshots, repositório ou logs.
O token OAuth do parceiro expira após uma hora; a função reutiliza-o enquanto
válido em cada instância. O header `x-page-id` identifica a loja no pedido v2.

## Segurança e regras

- Edge Function exige JWT do usuário e confirma sua identidade com Auth.
- Uma loja só pode pertencer a um usuário da Calcula Aí por vez.
- RLS permite apenas leitura própria; gravações pela função com service role.
- Nunca persista o token da loja nem pedidos/consumidores nesta etapa.
- O endpoint de teste descarta completamente o corpo da resposta de pedidos.
- Consultas `ping/list` devem respeitar ao menos **30 segundos** entre ciclos.
- Desconectar desabilita o vínculo **na Calcula Aí**; não revoga a autorização
  remota nem exclui dados na Anota AI. A revogação deve ser feita no admin.
- A publicação requer migração revisada, secrets e deploy manual da função e
  frontend. Abrir PR **não** realiza nenhuma dessas ações.

## Limites deliberados da etapa 1

Não importa pedidos, cardápio, estoque, CMV, dados de clientes ou DRE.
Não altera pedido no sistema de origem. Não faz polling automático.

## Próxima etapa: vendas e margem

Implementar, em nova revisão: sincronização incremental idempotente por
`(provider, loja, pedido)`, histórico dos pedidos importados, tratamento de
cancelamentos e descontos, conciliação de itens/adicionais com **receitas**
da Calcula Aí, e cálculo de custo unitário por rendimento. Nunca confundir
produtos comprados em estoque com itens vendáveis do cardápio. Pedidos são
consultados por dia no endpoint público; histórico anterior à ativação deve
ser estudado separadamente, sem prometer backfill indisponível.

## Validação pendente

Sem CLIENT ID/SECRET de parceiro e uma loja autorizada não há teste real.
Após configuração, validar em loja de teste: credenciais válidas/inválidas,
conta desconectada, vínculo entre diferentes usuários, 429 (30s), revogação,
resposta `success:false`, e webhooks caso sejam adicionados. Executar
`npm run check` e `npm run test:e2e` antes do merge. Não alterar produção
automaticamente; o fluxo de publicação segue manual pelo Lovable.

Reversão: reverter alterações de código; não remover tabela sem planejar
preservação de dados dos vínculos.
