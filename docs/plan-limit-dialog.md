# Limites de plano e mascote

Ao chegar ao limite, o aplicativo consulta o servidor antes de abrir um novo cadastro. O aviso central usa “Agora não” à esquerda e “Conhecer planos” à direita, levando a `/planos`. O plano atual também aparece durante o teste grátis.

O mascote fica triste sobre “Agora não” e feliz sobre “Conhecer planos”. As mesmas reações respondem ao foco por teclado e ao toque, sem atrasar a ação do botão. A preferência de movimento reduzido é respeitada. O código do aviso acompanha o layout autenticado. A imagem pequena é carregada e decodificada em segundo plano ao entrar no aplicativo, com prioridade baixa; assim, a resposta do servidor não inicia uma nova sequência de downloads. Os botões de novo cadastro mostram “Conferindo plano…” imediatamente durante a consulta, sem permitir cliques repetidos.

## Cobertura

- Receitas: botão de nova receita, URL direta, salvamento e duplicação.
- Matérias-primas: botão de novo cadastro e URL direta; o servidor também verifica inserções e reativações.
- Blocos de markup: aviso antes da inclusão.
- Fichas técnicas: conferência antes de carregar os dados e confirmação atômica da cota antes de salvar o PDF. Iniciante e teste grátis têm cota zero; Profissional mantém 80 por mês. Administradores preservam a exceção já existente.
- A trigger de limites protege todos os planos. Editar registros existentes continua permitido mesmo após reduzir o plano.

## Contagem de fichas técnicas

`private.pdf_export_usage` armazena a cota mensal, sem acesso direto do cliente. `consume_pdf_export()` usa a identidade autenticada e bloqueia a linha da conta para serializar downloads simultâneos. A migração preserva o uso anteriormente registrado e pode ser reaplicada sem zerar a cota. Os campos antigos editáveis do perfil não autorizam mais downloads.

O PDF continua sendo montado no navegador. A autorização protege o fluxo de download oferecido pelo aplicativo; não impede que alguém produza um documento por fora usando seus próprios dados. Uma geração que falhar antes de o arquivo ficar pronto não consome cota. Uma falha do navegador depois da autorização final pode contabilizar a tentativa.

## Validação

186 testes de interface e lógica, 20 cenários PostgreSQL, TypeScript e build de produção aprovados. Conferência do modal em Chromium a 1200×900 e 360×800, sem erros de JavaScript ou rolagem horizontal, incluindo mouse, teclado e navegação para planos. A inspeção visual usou o componente real em um cenário isolado; não realizou pagamento nem usou uma conta real de cliente.

## Tempo de abertura

Comparação local em Chromium, com build de produção e o provider/modal reais em uma página isolada. Três sessões novas por versão; rede simulada de 1,6 Mbps, latência de 150 ms, CPU 4× mais lenta e resposta de limite simulada com espera de 350 ms. O clique aconteceu após o carregamento inicial. Componentes compartilhados de botão, diálogo e ícones já estavam presentes, como na lista de receitas.

| Mediana, em milissegundos | Antes | Depois |
| --- | ---: | ---: |
| Clique até resposta da conferência | 365 | 364 |
| Clique até montagem do aviso | 645 | 435 |
| Clique até aviso visível e imagem pronta | 943 | 575 |
| Espera após a resposta do servidor | 579 | 210 |
| Downloads de arquivos do aviso após o clique | 3 | 0 |

Nesse cenário, o tempo até o aviso completo caiu 39%. A animação de entrada continua incluída no tempo. Os resultados medem o fluxo isolado, não a latência de contas reais em produção; um clique antes de terminar o pré-carregamento ainda pode aguardar a imagem. A autorização continua consultando o servidor a cada tentativa, sem cache de permissões ou mudança na proteção dos PDFs. Reações do mascote e ausência de rolagem horizontal conferidas a 390×844.

A otimização passou nos 21 testes focados de navegação e permissões, no TypeScript e no build de produção, incluindo uma resposta lenta: o botão reage imediatamente, bloqueia cliques repetidos e só apresenta o aviso após a resposta.

## Arte do mascote

Arquivo do projeto: `src/assets/plan-mascot.webp` (512×512, transparência, 26.538 bytes). A base foi criada com a ferramenta integrada `image_gen`, usando a imagem de referência fornecida. Os olhos, a boca e as reações estão em `src/components/planos/PlanMascot.tsx` e `plan-mascot.css`.

Prompt utilizado:

> Use case: identity-preserve. Asset type: interactive web app mascot base with a face drawn by code. Reference image: the attached official CalculaAi robot chef character sheet. Create ONE centered front-facing head and chef hat only, with the same adorable high-quality 3D white robot, shiny blue left side, magenta and orange right trim, white puffy chef hat with the original colorful CalculaAi symbol. CRITICAL: the inner white face panel must be completely BLANK, with NO eyes, NO mouth, NO eyebrows, NO cheek marks. The eyes and mouth will be animated with code. Preserve the exact identity and 3D style of the character. Symmetrical straight frontal view, not tilted, full hat and entire rounded head visible. Head occupies most of a square canvas with 8% transparent margin. Genuinely transparent background, no card, no shadow background, no labels, no lettering, no body, no arms, no calculator, no cupcake. Soft studio lighting. This is a production asset for a small centered plan-limit dialog.
