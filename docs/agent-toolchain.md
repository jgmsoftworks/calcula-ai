# Ferramentas de agentes — piloto Calcula Aí

**Decisão:** 16/11/2026. **Escopo:** desenvolvimento local e instruções consumidas pelo Codex/ChatGPT Work. Nenhuma das quatro é dependência de runtime da Calcula Aí. Não instalar em Vercel, Supabase, Edge Functions ou no workflow de qualidade.

| Ferramenta | Aplicação | Estado nesta PR |
| --- | --- | --- |
| [Graphify](https://github.com/Graphify-Labs/graphify) | Grafo de dependências para localizar impacto entre componentes, hooks e SQL | Configuração e exclusão de arquivos sensíveis; geração local pendente |
| [Ponytail](https://github.com/DietrichGebert/ponytail) | Menor correção segura, com testes para riscos | Princípios adaptados ao AGENTS.md; plugin local opcional |
| [RTK — Rust Token Killer](https://github.com/rtk-ai/rtk) | Reduzir saída de comandos de terminal | Opcional, instalado fora do projeto |
| [Caveman](https://github.com/JuliusBrussee/caveman) | Respostas curtas e compressão opcional de contexto | Skill/runtime externo opcional; medir separadamente |

**Importante:** a presença desses arquivos no GitHub **não** instala ou ativa binários, hooks, plugins e skills do Codex nem do Work. Nenhuma economia de tokens foi medida.

## Diagnóstico sem instalação

No checkout local:

```bash
npm run agents:doctor
```

O comando só verifica a presença de executáveis no PATH; não baixa pacotes, não lê credenciais, não ativa hooks e não garante que skills estejam carregadas.

## Windows (PowerShell) — instalação manual e individual

Instale somente ferramentas cujo código, versão e permissões você revisou, na **máquina de desenvolvimento**, não em produção.

### 1. Graphify (primeiro piloto)

Requer Python 3.11+ e uv. O pacote PyPI oficial se chama **graphifyy** (dois y):

```powershell
winget install astral-sh.uv
uv tool install graphifyy
graphify --version
graphify install --project --platform codex
```

A última linha pode criar arquivos em `.agents/skills/graphify/` ou tocar instruções existentes: **revise o diff antes de versionar**. No Codex, peça **`$graphify .`** para gerar `graphify-out/graph.json`, `GRAPH_REPORT.md` e `graph.html`. Em agentes que usam comando slash, a forma é `/graphify .`.

Depois de gerar:

```powershell
graphify query "Como as receitas se conectam a custos e estoque?"
graphify path "<nó-real-A>" "<nó-real-B>"
```

Use nomes reais de nós identificados no relatório. O grafo marca ligações inferidas; valide no código. O `.graphifyignore` exclui `.env`, chaves e saídas geradas; revise sempre os arquivos efetivamente indexados. **Primeiro piloto estritamente local**, sem serviços cloud nem chaves adicionais.

### 2. Ponytail (segundo piloto)

Com Codex CLI instalado, conforme documentação do projeto:

```powershell
codex plugin marketplace add DietrichGebert/ponytail
codex plugin add ponytail@ponytail
```

Reinicie o Codex, abra `/hooks` e revise antes de confiar nos hooks. Nunca deixe regras do plugin se sobreporem às áreas protegidas, permissões ou testes de `AGENTS.md`. Reversão: `codex plugin remove ponytail`.

### 3. RTK (terceiro piloto)

```powershell
winget install rtk-ai.rtk
rtk --version
rtk gain
```

**Confirme `rtk gain`**: existe outro pacote com o nome RTK, o Rust Type Kit. Os filtros são apenas para o terminal local do agente. Em falhas de teste, logs de segurança ou auditoria, confira a saída **original**. Não executar automaticamente `rtk init -g` (modifica hooks globais). Reversão no Windows: `winget uninstall rtk-ai.rtk`.

### 4. Caveman (quarto piloto)

```powershell
npx skills add JuliusBrussee/caveman -g
```

No Codex, `$caveman` pode ativar a skill. Não confundir a skill de respostas concisas com o runtime/proxy de compressão: **o proxy não é instalado por esta PR**. Nunca abreviar contratos técnicos, resultados de teste ou alertas de segurança. Avalie se traz benefício além do RTK.

Para macOS/Linux, use os métodos de instalação nos repositórios oficiais; não cole instaladores remotos sem revisá-los.

## ChatGPT Work e Codex

- Work com acesso GitHub pode ler `AGENTS.md`, o código e esta documentação. **Não assuma** suporte automático às skills/plugins locais do Codex.
- Se Graphify estiver disponível: consultar grafo **antes** de mudanças grandes, com prova em arquivos atuais. Caso contrário, leitura convencional do repositório.
- Para mudanças pequenas: não gerar grafo desnecessariamente. Siga a cadeia de dependências relevante, sem refatoração expansiva.
- CI e validação continuam `npm run check` e `npm run test:e2e`. Ferramentas de compressão não substituem logs completos ou o status oficial dos checks.
- Nunca executar migrations, RLS, cobranças, autenticação, publicação ou ações em contas reais a partir desse piloto.

## Medição e decisão

Avalie tarefas equivalentes de impacto (por exemplo, receita → custo → estoque) com **uma ferramenta por vez**. Registre: versão, ambiente, tempo para encontrar arquivos relevantes, arquivos lidos, tokens medidos quando disponíveis, testes/regressões e custo de retrabalho. Resultados divulgados pelos autores não garantem a mesma economia aqui. Desative ferramentas que ocultem evidências ou aumentem retrabalho.

**Revisão:** diante de mudança de versão, CLI, Codex ou política de hooks, registrar data, fonte e resultado antes de declarar adoção concluída.
