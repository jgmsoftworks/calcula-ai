# Código PDV e integração de receitas

Decisão de 16/11/2026. Base do app: `7cd2997fb6ad124caf671754a1b37bdf21cbb59e`;
pré-requisito: [histórico de custos](recipe-cost-history.md), já ativado no banco.
A aplicação continua em React/Vite/Supabase. Não há mudança na fórmula de custo,
precificação, planos, autenticação de usuários ou permissões do editor.

## Identidade e formulário

Código PDV opcional, abaixo da imagem na aba Geral, salvo junto de toda a receita
pela RPC atômica. É texto de até 64 caracteres; espaços nas pontas são removidos,
branco vira null e caracteres de controle são rejeitados. `0471` e `471` são
códigos distintos. Unicidade por conta é garantida por índice no banco, inclusive
entre gravações concorrentes. Nomes nunca identificam o vínculo.

Duplicar receita limpa o PDV na cópia. Clientes antigos que omitem a propriedade
preservam o PDV existente; enviar null remove o vínculo. Erros de unicidade mantêm
o editor aberto. A nova coluna não é adicionada manualmente aos tipos gerados:
o contrato de domínio e o payload JSON da RPC carregam o campo.

## API e segurança

`POST /functions/v1/receitas-pdv` recebe `Authorization: Bearer <chave exclusiva>`
e somente `{ "mes": "YYYY-MM" }`. Sem CORS para navegador. A chave aleatória
não é a service role de nenhum aplicativo. O painel guarda a chave em tabela
com RLS e SELECT exclusivo do servidor; a Calcula Aí guarda somente SHA-256.
A chave está vinculada a um único proprietário e pode ser revogada. Nenhum
`user_id` é aceito da requisição. Apenas receitas e custos desse proprietário
são retornados; componentes, fornecedores, clientes e credenciais são omitidos.

A função Edge autentica a chave via `exportar_receitas_painel` com o cliente
interno do próprio projeto. A RPC é SECURITY INVOKER, executável apenas por
service_role, e filtra receita/histórico pelo proprietário associado ao hash.
Anon e authenticated não leem tokens nem executam a exportação. `verify_jwt=false`
é exclusivo deste endpoint porque ele usa autenticação própria, não JWT do cliente.
Referência: [autenticação Edge](https://supabase.com/docs/guides/functions/auth).

## Catálogo e atualização

A resposta agrega todas as receitas em um JSON, inclusive sem PDV, sem vendas ou
rascunhos, sem depender do limite padrão de mil linhas da API REST. Inclui ID,
nome, PDV, status e custo/unidade/moeda/data do histórico. Não copia registros
para outro banco nem depende de eventos que possam se perder: o painel consulta
a fonte ao abrir/trocar mês e a cada 30 segundos enquanto visível. Retomar a tela
atualiza também. Criar, editar, preencher/remover PDV e excluir uma receita se
refletem na próxima consulta. Fechar a tela não interrompe o histórico no banco.

Receitas não encontradas nas vendas aparecem com quantidade e total vendido zero;
valor de venda unitário fica vazio. Ao preencher o mesmo PDV, o painel une a receita
à venda e deixa de exibir a linha separada. A venda conserva seu nome no Yooga.

## Custo por mês

Usa o último snapshot anterior ao início do próximo mês no fuso America/Sao_Paulo,
ou até agora no mês atual. Não é média de custos nem CMV ponderado por venda.
Nenhum custo atual é atribuído retroativamente a meses anteriores ao histórico.
A unidade exibida é a unidade de rendimento da receita; não se converte gramas,
quilogramas e unidades de PDV sem um contrato de conversão. Rendimento inválido,
histórico ausente, moeda diferente de BRL e indisponibilidade têm estados distintos
e nunca viram custo zero. O valor de venda continua vindo exclusivamente do Yooga.

## Ativação e reversão

Aplicar somente `20261117012133_receitas_pdv_integracao.sql`, depois de confirmar
as funções existentes e a equivalência da migração de histórico local/remota.
A função de salvamento remota ainda não tem a validação SQL de markup presente
no arquivo local `require_recipe_markup`. Esta migração preserva cada versão
instalada e acrescenta somente os dois trechos de PDV, com conferência dos pontos
de inserção. Não publica regras pendentes de outra funcionalidade.
Não replay/reset/db push. Implantar `receitas-pdv` e provisionar a chave pelo
servidor, associando o hash exclusivamente ao proprietário autorizado. Não gravar
chaves em código, documentação, histórico git ou logs. A rotação gera nova chave
no painel, cadastra seu hash na origem e revoga a anterior.

Frontend segue publicação manual pelo Lovable depois da integração revisada.
Reversão: restaurar frontend/painel anteriores e revogar a integração. Conservar
as colunas e o histórico aditivos; não apagar receitas ou custos.

Validação: `npm run check`, SQL PGlite (isolamento/ACL, códigos, catálogo completo,
histórico temporal, repetição/rollback), endpoint com doubles e formulário real.
`npm run test:e2e` confere o campo abaixo da imagem em desktop/mobile usando
fixture sintética, sem sessão de cliente ou escrita em produção.
