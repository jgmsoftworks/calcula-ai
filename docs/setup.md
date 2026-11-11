# Ambiente de desenvolvimento e testes

Referência validada: Node 24.22.1, npm 11.9.0, Linux. `.nvmrc` fixa Node e
`package-lock.json` é a fonte do ambiente npm de verificação. Os lockfiles Bun
herdados foram preservados; não os trate como equivalentes sem testar.

```sh
nvm use
npm ci --ignore-scripts --no-audit --no-fund
npm run check
```

`.npmrc` usa `legacy-peer-deps=true` porque a instalação padrão falha com os peers
herdados `date-fns@4`/`react-day-picker@8` e Vite/Vitest. Isso reproduz o lockfile;
não corrige os conflitos. Atualize essas versões separadamente, com regressão de
calendário/testes. Não usar `--force` ou `npm audit fix --force`.

Scripts de instalação de dependências ficaram desabilitados na verificação
validada deste ciclo. Se uma tarefa futura precisar deles, revise a origem e a
finalidade e execute apenas o necessário. Não executar instaladores remotos ou
scripts do Toolkit automaticamente.

## Navegador

```sh
npm exec --no -- playwright install chromium
npm run test:e2e
```

Em runner Linux limpo, o workflow usa `playwright install --with-deps chromium`.
A versão vem do Playwright do lockfile; `--no` impede download implícito de outra
versão pelo npm exec. O teste inicia Vite em `127.0.0.1:4173`, sem reaproveitar
servidor existente, e bloqueia tráfego externo na fixture.

Se o download do navegador estiver indisponível e houver Chromium instalado,
é possível apontar `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para seu executável.
Registre essa diferença na validação; o CI continua usando o browser do Playwright.

`npm run dev` abre o app normalmente na porta 8080. O cliente gerado aponta para
o Supabase real; definir `VITE_SUPABASE_URL` não substitui automaticamente esse
literal. Os testes usam mocks, PGlite e bloqueio de rede, não essa substituição.

As verificações não exigem chave Stripe, service role, senha SMTP ou sessão de
cliente. Não forneça credenciais de produção.

## Ferramentas adicionais

Avalie origem, versão fixa, licença, scripts e necessidade antes de instalar.
Não duplique framework, ORM, formatter ou logger. Skills/MCPs precisam de suporte
confirmado no cliente: configuração do Codex CLI/Claude não ativa automaticamente
recursos no Work.
