# Arquitetura e fontes de contexto

Verificado em 11/11/2026 a partir de `35dabe14ed155198c289e354d32e9a01ff8bb591`.
Revisar quando rotas, persistência, integrações ou publicação mudarem.

| Área | Local | Responsabilidade |
| --- | --- | --- |
| Entrada/rotas | `src/main.tsx`, `src/App.tsx` | Providers, navegação e páginas lazy |
| Interface | `src/pages`, `src/components` | Interação; shadcn/Radix personalizados |
| Estado/operações | `src/hooks`, `src/lib/*Data.ts`, `src/contexts` | Queries, formulários e regras auxiliares |
| Supabase | `src/integrations/supabase` | Cliente e tipos gerados |
| Operações atômicas | `src/lib/recipe-save.ts`, `supabase/migrations` | Contratos SQL/RPC, concorrência e histórico |
| Backend | `supabase/functions` | Deno Edge Functions e integrações |
| Testes | `src/**/__tests__`, `supabase/tests`, `tests`, `e2e` | UI/lógica, SQL, billing, ferramentas e navegador |

Stack: React 18, TypeScript, Vite 5, Tailwind 3, React Router 6, TanStack Query,
React Hook Form/Zod e Supabase. Há Stripe/SMTP e configuração Capacitor. Não é
Next.js nem React Native. A landing/painel usa React 19/TanStack Start/Tailwind 4
e outro Supabase; configurações não são intercambiáveis.

## Documentos canônicos

- Receitas: [salvamento atômico](atomic-recipe-save.md), [performance](recipe-performance-2026-10-12.md).
- Estoque: [editor](stock-product-editor.md), [nutrição](stock-nutrition-stage1.md),
  [marcas](stock-nutrition-brands.md), [performance](product-pages-performance-2026-10-21.md).
- Acesso/planos: [pagamento](payment-access-flow.md), [trial](lite-trial.md),
  [limites](plan-limit-dialog.md), [planos](plans-page.md), [aquisição](trial-acquisition.md).
- Admin: [métricas](admin-financial-metrics.md), [dashboard](dashboard-reports-performance-2026-10-21.md).
- Região: [Portugal](portugal-rollout.md), [configuração](portugal-pricing.json).
- Interface: [cores](brand-colors.md), [auth/mídia](auth-media-performance-2026-10-21.md).

Documentos históricos explicam decisões; confirme no código/configuração atual
quando houver divergência. Não copie preços e limites para novas memórias.
Reutilize o logger em `src/lib/logger.ts` e os componentes existentes.

## Estado remoto

O inventário de 11/11/2026 encontrou 47 funções remotas e 38 entradas no main,
além de 189 migrations em cada lado com apenas 15 identificadores exatamente iguais.
Isso não prova 174 migrations pendentes. Identifique fontes adicionais e compare
conteúdo/efeito em ambiente descartável antes de automatizar operações remotas.
O CI não executa deploy, reset, repair ou replay em produção.

Testes SQL carregam migrations selecionadas em fixtures PGlite; não reconstroem
todo o Supabase. Auth/PostgREST/Storage/Edge reais precisam de ambiente separado.
