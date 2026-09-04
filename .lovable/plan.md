# Pente-fino de segurança — os 20 pontos

Verifiquei cada item direto no banco (grants, políticas, buckets), no linter do Supabase, no código do app e nas funções do servidor. Abaixo o estado real de cada um.

## Situação atual

| # | Item | Estado |
|---|------|--------|
| 1 | Esconder chaves de API | OK — chaves secretas ficam nos "secrets" do servidor; no navegador só a chave pública |
| 2 | Limpar segredos do git | Atenção — o arquivo `.env` está versionado (só contém valores públicos) e não está no `.gitignore` |
| 3 | Chave pública do banco | OK — é publicável por design |
| 4 | RLS ativo | OK — todas as 66 tabelas têm RLS ligado |
| 5 | Criptografia | OK em trânsito e em repouso (Supabase). Sem criptografia extra de campo |
| 6 | Autenticação no servidor | OK — sessão validada pelo Supabase; funções administrativas checam papel de admin |
| 7 | Restringir acessos | Ajustar — 5 tabelas são legíveis sem login e 1 aceita gravação anônima |
| 8 | Bloquear "mass assignment" | Parcial — perfil protegido por gatilho; falta o mesmo cuidado em outros pontos |
| 9 | Proteger cookies | OK — sessão em armazenamento local do navegador, sem cookie próprio |
| 10 | Hash de senhas | OK — feito pelo Supabase (bcrypt), nunca guardamos senha |
| 11 | Limite de tentativas | Faltando — nenhuma função do servidor tem limite de chamadas |
| 12 | Proteção contra robôs | Faltando na prática — o Turnstile está preparado, mas desligado |
| 13 | Consultas parametrizadas | OK — nenhuma montagem de SQL por texto |
| 14 | Validação de entradas | Faltando — nenhuma função do servidor valida o formato dos dados recebidos |
| 15 | Vazamento de conteúdo | Ajustar — links de pagamento, histórico de preços, avaliações e promoções são lidos sem login |
| 16 | Restringir uploads | Faltando — 3 pastas de arquivos públicas sem limite de tamanho nem de tipo |
| 17 | Enxugar respostas | Parcial — várias telas trazem todas as colunas, inclusive dados sensíveis de folha |
| 18 | Cabeçalhos de segurança | Parcial — só existem 3 via HTML; falta CSP e HSTS de verdade |
| 19 | Forçar HTTPS | OK — hospedagem já força |
| 20 | Varredura de dependências | Faltando — nunca rodou; o comando padrão está bloqueado no ambiente |

## Riscos principais encontrados

1. **Qualquer visitante consegue ler**: `payment_links`, `planos_precos_historico`, `avaliacoes_fornecedores`, `promocoes_fornecedores`.
2. **Qualquer visitante consegue gravar** em `csp_violations` (a regra aceita inserção de todo mundo) — dá para inundar a tabela.
3. **Uploads sem trava**: as pastas de fotos de receitas, fotos de produtos e logos são públicas e aceitam arquivo de qualquer tipo e tamanho.
4. **Sem limite de chamadas** em funções caras/sensíveis (checkout, exportação de dados, geração de imagens, e-mails).
5. **Sem validação de entrada** nas funções do servidor — hoje confiamos no formato enviado pelo app.
6. **Sem CSP real** — a proteção contra injeção de script no navegador está só em modo relatório.
7. Pendências de painel já conhecidas: proteção contra senhas vazadas desligada e `STRIPE_WEBHOOK_SECRET` não configurado.

## O que proponho fazer

### Etapa 1 — Fechar acessos indevidos (banco)
- Tirar o acesso de visitante das 4 tabelas legíveis sem login (mantendo `payment_links` público apenas se a página de checkout precisar antes do login — confirmo no código antes).
- Trocar a regra de gravação de `csp_violations` para aceitar só o servidor.
- Revogar do visitante a execução das funções internas do banco que não precisam ser públicas.

### Etapa 2 — Uploads
- Definir limite de tamanho (5 MB) e tipos permitidos (JPEG, PNG, WebP) nas três pastas públicas.
- Validar tipo e tamanho também na hora do envio, com mensagem clara.

### Etapa 3 — Validação e limite de chamadas no servidor
- Criar um validador compartilhado com Zod e aplicar nas funções que recebem dados do usuário (checkout, cupons, exportação, importação de planilha, sugestões, imagens, produção compartilhada).
- Criar um limitador por usuário/IP guardado no banco e aplicá-lo nas funções sensíveis (ex.: 10 chamadas por minuto; exportação 3 por hora).

### Etapa 4 — Cabeçalhos e higiene
- Adicionar arquivo de cabeçalhos com CSP, HSTS, X-Frame-Options e política de referência.
- Colocar `.env` no `.gitignore` e removê-lo do versionamento.
- Enxugar as consultas que trazem colunas sensíveis desnecessárias (principalmente folha de pagamento e perfis).

### Etapa 5 — Dependências e bot
- Rodar a varredura de dependências disponível na plataforma e corrigir o que aparecer.
- Decidir se ligamos o Turnstile no cadastro/login (hoje está pronto, só desligado).

### Etapa 6 — Ajustes manuais seus (painel Supabase/Stripe)
- Ligar "Leaked password protection".
- Configurar `STRIPE_WEBHOOK_SECRET`.
- Atualizar os agendamentos para enviarem o cabeçalho `x-cron-secret`.

## Detalhes técnicos

- Migrações: `REVOKE`/`DROP POLICY` nas 4 tabelas públicas; nova política de `csp_violations` restrita a `service_role`; `REVOKE EXECUTE ... FROM anon` nas funções `SECURITY DEFINER` não públicas.
- Buckets: ajuste via ferramenta de bucket (`file_size_limit`, `allowed_mime_types`).
- Novo `supabase/functions/_shared/validate.ts` (Zod) e `_shared/rateLimit.ts` com tabela `rate_limits` (user_id/ip, chave, janela, contador) e RLS restrita ao `service_role`.
- Novo `public/_headers` com CSP incluindo `*.supabase.co`, Stripe e Google Fonts; manter o modo relatório por 1 ciclo antes de bloquear.

## Confirmação necessária

Antes da Etapa 1 vou conferir no código se a página pública de checkout depende de `payment_links` sem login; se depender, mantenho a leitura pública apenas dos campos necessários.
