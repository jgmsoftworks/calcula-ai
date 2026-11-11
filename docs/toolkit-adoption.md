# Adoção seletiva do Vibe Coding Toolkit

Decisão de 11/11/2026. Referências:
[Toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit/tree/7ef68dd7b00ddfc5cd464458855e4ab66dd2128f)
e [prompt para projeto existente](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/7ef68dd7b00ddfc5cd464458855e4ab66dd2128f/docs/prompts/12-existing-project-setup.md).

Após a auditoria, foi autorizado o núcleo de confiabilidade: contexto dos agentes,
organização dos testes e CI, com publicação manual. Esta entrega adapta práticas;
não instala o catálogo de plugins nem troca frameworks, ORM ou serviços.

## Adotado

- Instruções e fontes de domínio próprias deste repositório.
- Setup reproduzível com lockfile existente e peers conflitantes documentados.
- Tipos, limite para novas ocorrências ESLint, testes consolidados e build.
- Bloqueio de tráfego real nos testes e smoke inicial de navegador.
- Workflow sem publicação/migrations, actions fixadas e permissões mínimas.

## Escopos posteriores

- Dependências de produto, funções/migrations remotas, otimizações SQL/RLS e
  jornadas autenticadas completas de navegador.
- Graphify/Context7/Harness: piloto só quando houver benefício demonstrado.
- Sentry, Obsidian, RTK e hooks globais: sem necessidade demonstrada neste ciclo.
- Defaults Next/Drizzle/Pino e Jev/TypeSafe: não se aplicam como padrão.

## Memória e revisão

Documentos devem apontar fonte, revisão/data e condição de atualização. Handoff:
objetivo, branch/commit, alterações, comandos, resultados, pendências e próximo
passo. Fatos voláteis vêm da fonte atual; não copiar preços para a memória do
agente nem guardar dados de clientes/segredos.

Quando solicitada, revisão com agentes pode separar negócio, segurança/dados e
UI/performance. Cada revisor apresenta cenário, arquivo e evidência; um responsável
confirma e integra. Não operar o mesmo banco ou editar os mesmos arquivos em
paralelo. Ajustes pequenos pedem revisão simples e testes relevantes.

No Work via GitHub, ler explicitamente AGENTS e fontes é o procedimento verificável.
Nenhuma configuração local de outro cliente foi apresentada como integração ativa.
Reavaliar esta decisão se stack, cliente de desenvolvimento, publicação ou
necessidade de revisão mudar.
