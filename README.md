# Calcula Aí

Aplicativo de precificação e gestão para negócios de alimentação. React 18/Vite,
com PostgreSQL, Auth, Storage e Edge Functions no Supabase.

## Desenvolvimento e verificação

```sh
nvm use
npm ci --ignore-scripts --no-audit --no-fund
npm run check
```

Referência: Node 24.22.1 e npm 11.9.0. A instalação mantém o lockfile existente;
os conflitos de peers estão documentados em [setup](docs/setup.md).

`npm run dev` inicia o Vite na porta 8080. O cliente Supabase versionado aponta
para o serviço real: use uma conta/ambiente apropriado. Para navegação isolada:

```sh
npm exec --no -- playwright install chromium
npm run test:e2e
```

## Documentação

- [Instruções para agentes](AGENTS.md)
- [Arquitetura e fontes por domínio](docs/architecture.md)
- [Preparação do ambiente](docs/setup.md)
- [Verificações, baseline e limites dos testes](docs/quality.md)
- [Adoção incremental do Toolkit](docs/toolkit-adoption.md)

## Edição e publicação

O projeto continua integrado ao [Lovable](https://lovable.dev/projects/ac17244e-6d9b-412a-86b9-4aefcc03057a).
Mudanças são revisadas por branch/PR. A publicação permanece manual em Share →
Publish; o workflow de qualidade não publica nem executa migrations.

A landing e o painel comercial ficam em `jgmsoftworks/landing-calculaai`,
com configurações e banco próprios.
