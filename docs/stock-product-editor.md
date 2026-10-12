# Página de cadastro de produtos

## Alteração

Criar ou editar pela lista de estoque abre `/estoque/novo` ou `/estoque/:id/editar`. A seta, Cancelar e o salvamento concluído retornam à lista com a busca e os filtros preservados na URL.

- Três guias: Estoque & Custos, Rótulo nutricional e Histórico. Modo de Uso está na mesma guia de estoque/custos. Histórico fica disponível após cadastrar o produto.
- O editor ocupa a altura disponível da tela. O conteúdo rola dentro do formulário, com guias no topo e ações fora da rolagem, sempre no rodapé. Botões com altura mínima de 44 px e margem para a área segura do aparelho.
- Em telas menores, os campos aparecem antes da foto. No computador, foto e campos ficam lado a lado. O suporte vai para o cabeçalho do editor para não cobrir campos nem ações.
- A edição busca um único produto ativo, filtrado também pelo usuário autenticado. Carregamento ou falha não abre um formulário vazio. Não recarrega o formulário ao alternar janela ou reconectar.
- Dados em edição permanecem ao trocar de guia. Ações de sair/salvar ficam desabilitadas durante a gravação; erro mantém o rascunho para tentar novamente. Regras de custo/conversão e persistência do rótulo continuam existentes. Sem migração de banco nesta etapa.

## Verificação

- 79 testes em 13 arquivos passaram, incluindo seis novos cenários com roteador e formulário reais: criação pela lista, edição e retorno com filtros, troca de guias, gravação pendente, falha e nova tentativa, carregamento indisponível e validação em outra guia.
- TypeScript e build de produção passaram. Continua o aviso já existente de chunks maiores que 500 kB.
- Firefox headless com os componentes reais de layout/editor, autenticação e dados simulados: larguras de 320, 360, 768, 1024 e 1440 px. Conferidos limites da página, posição dos botões antes/depois da rolagem, guias nutricional/histórico e retorno após salvar. Sem escrita no banco de produção.
- A emulação de dimensões não substitui teste em aparelhos físicos, especialmente teclado virtual e área segura de iOS/Android.

Entrega pelo Git. A publicação continua sendo feita pelo responsável na Lovable.
