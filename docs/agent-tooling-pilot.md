# Piloto de ferramentas de agentes — 16/11/2026

Escopo: **somente ambiente de desenvolvimento**. Este documento é uma integração
operacional proposta e versionada, **não** uma alegação de que executáveis estão
instalados no computador, no Work, no CI ou no servidor de produção.

## Contexto e regras obrigatórias

- Leia `AGENTS.md`, `docs/architecture.md`, `docs/quality.md` e o documento do
  domínio afetado **antes** de editar.
- Use a stack existente: React/Vite/TypeScript, Supabase e npm/Node conforme
  `.nvmrc`. Não instalar dependências de runtime por conveniência do agente.
- Aplique mudanças pequenas em branches e PRs; não publicar pelo Lovable,
  executar migrations remotas, testar pagamentos reais ou tocar dados de clientes.
- Priorize fonte original e testes. Nunca use compressão de logs como substituto
  de inspecionar o erro completo em uma falha.
- Plugins, scripts, hooks e proxies de terceiros devem ter origem e permissões
  verificadas antes da execução. Não transmitir segredos ou conteúdo privado a
  serviços externos sem revisão e autorização específica.

## 1. Graphify: mapa de dependências (primeiro piloto)

Projeto: https://github.com/Graphify-Labs/graphify

Em uma cópia **local** do projeto, após revisar a instalação e as permissões
descritas no repositório oficial, gerar um grafo da árvore atual e consultar os
caminhos de alterações *antes* de mudanças transversais. Iniciar com os domínios:
receitas/sub-receitas → estoque → produção/Geladeira → custos/CMV → relatórios.

- Comparar conclusões do grafo com `docs/architecture.md` e código atual.
- Evitar indexar `.env*`, dumps, dados de clientes, credenciais e saídas de build.
- Guardar relatório com a revisão/commit analisado, limites e dependências que
  não puderam ser inferidas (particularmente RPCs/Edge Functions remotas).
- Não presumir suporte/instalação no Work via GitHub; a execução exige ambiente
  local compatível.

## 2. Ponytail: disciplina de implementação (já aplicável como política)

Projeto: https://github.com/DietrichGebert/ponytail

Sem exigir o plugin, aplicar estes princípios em toda alteração:
1. Entender a execução real e escolher a menor alteração correta.
2. Reutilizar módulos, validações, tipos e padrões já existentes.
3. Nunca sacrificar autenticação/RLS, precisão monetária, tratamento de falha,
   acessibilidade ou persistência para diminuir linhas.
4. Criar/atualizar teste para regras condicionais, cálculos e falhas.
5. Informar o que foi alterado, comandos realmente executados e riscos restantes.

Instalação do plugin Codex é **opt-in** e depende de um ambiente de agente que
suporte plugins/hooks. Verificar hooks de ciclo de vida antes de habilitá-los.

## 3. RTK: redução de saída de terminal (piloto opt-in)

Projeto: https://github.com/rtk-ai/rtk

Instalar apenas na máquina de desenvolvimento, seguindo o guia oficial para o
sistema operacional. Medir saída/token antes e depois em `git status`, lint,
testes e build. Não instalar em CI nem forçar reescrita de todos os comandos.

Critério para aceitar: mesmas decisões de diagnóstico e nenhuma perda de erros
que altere a correção. Para análise de falhas, repetir o comando original sem
filtro. Registrar `rtk gain` apenas como métrica local, não como prova de
qualidade.

## 4. Caveman: comunicação/compactação (piloto separado)

Projeto: https://github.com/JuliusBrussee/caveman

Primeiro avaliar **somente a skill de concisão**, sem proxy, roteamento automático
de modelos nem alteração global de autenticação. Comparar respostas completas
e resumidas para incidentes de produção, segurança, cobrança e dados.

Critério para aceitar: não omitir pré-condições, logs relevantes, efeitos
colaterais, comandos de validação nem riscos. Não combinar automaticamente
Caveman e RTK antes de medir perdas de contexto.

## Validação e decisão de adoção

Antes/depois de mudanças de código, executar no ambiente configurado:

```sh
nvm use
npm ci --ignore-scripts --no-audit --no-fund
npm run check
# se o fluxo de interface for afetado:
npm run test:e2e
```

Registrar para cada piloto: commit, instalação real, sistema operacional,
permissões/hooks, escopo da análise, número de tokens quando disponível, erros
identificados, regressões e possibilidade de reverter.

**Situação nesta PR:** política/documentação adicionada; nenhum plugin instalado,
grafo executado ou benchmark realizado; sem alterações de aplicação, banco, CI
ou publicação. Este piloto pode ser rejeitado/removido sem efeito no produto.

## Relação com o REA

REA não é pré-requisito para analisar a Calcula Aí: temos o código autorizado.
Para terceiros, use apenas acesso autorizado e documentação de comportamentos,
sem obter dados privados, contornar autenticação ou reutilizar propriedade
intelectual protegida.
