# Tela de planos dentro do aplicativo

A página `/planos` apresenta os planos pela fase do negócio. O cabeçalho destaca precificação e crescimento; o painel da conta informa o plano atual e os dias restantes do teste, ou a preservação dos dados após seu término. O Profissional tem destaque visual pelas capacidades oferecidas, sem selo de popularidade não comprovada.

Os valores, nomes e limites continuam vindo de `public.planos`. O mensal é o padrão. No anual, o total cobrado por ano aparece em destaque; o equivalente mensal é identificado como equivalência. A economia é calculada contra 12 mensalidades do mesmo plano. Um preço anual ausente não é anunciado como gratuito.

As quantidades dos cartões e da comparação usam os limites efetivos do catálogo, incluindo a ausência de fichas técnicas no Iniciante. Recursos adicionais, como suporte e folha de pagamento, são preservados a partir do cadastro. O teste grátis mantém os limites do Iniciante.

O fluxo de pagamento permanece no `useStripe`: contas sem assinatura seguem para o checkout com plano, periodicidade e eventual indicação de afiliado. Assinaturas existentes seguem para o portal de gerenciamento, com essa etapa explicada na tela. A página não altera preços, assinaturas, permissões ou dados no banco. Todos os botões de contratação ficam indisponíveis durante a abertura do pagamento ou quando não é possível verificar a conta.

A apresentação usa a tipografia e as cores existentes, CSS local e os ícones funcionais já disponíveis. Não acrescenta imagens, vídeos, fontes ou bibliotecas. A grade responde ao espaço disponível dentro do aplicativo. No celular, o resumo do teste é compacto e a comparação tem rolagem própria. Os estados de carregamento, falha do catálogo e conta não verificada oferecem feedback e recuperação. As dúvidas frequentes usam elementos nativos `details`/`summary`.

## Validação

Testes de interação cobrem identificação do plano atual, restrição de PDF, preços anuais vindos do catálogo, economia, indicação de afiliado, checkout mensal após teste expirado, portal para assinantes, bloqueio de cliques repetidos, preço anual ausente e recuperação de erros.

A inspeção em Chromium usa a página real com catálogo espelhado da consulta e respostas simuladas dos hooks. Inclui 360 e 390 px, tablet de 820 px e desktop de 1440 px, temas claro/escuro, mensal/anual, teste ativo/expirado, assinante, erro e carregamento. Não realiza pagamento nem acessa uma conta real de cliente.

Validação concluída: 8 testes da página e 1 de leitura compartilhada do plano, lint dos arquivos TypeScript alterados, TypeScript e build de produção. Os 9 cenários visuais não apresentaram erros de JavaScript nem rolagem horizontal da página. A comparação no celular mantém sua própria rolagem horizontal.
