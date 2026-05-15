# Plano — Correção do duplo load + Pente fino LGPD/Segurança

## 1. Bug do "duplo load" em toda navegação

### Causa raiz
Em `src/App.tsx`, cada rota é declarada como `<Route element={<AppLayout><Page/></AppLayout>}/>`. Como o `AppLayout` é instanciado **dentro** do `element` de cada `<Route>`, o React Router **remonta** o `AppLayout` inteiro a cada navegação (Sidebar + Header + Providers locais).

Dentro do `AppLayout`:
- `isReady` começa `false` e só vira `true` após `setTimeout(..., 100ms)` → spinner aparece por ~100ms a cada navegação.
- O bloco `hasAuthFragment` roda em todo mount (3s timer), mas só ativa se houver `#access_token` na URL.
- `useMarkupInitializer` roda novamente.

Resultado: ao clicar num item da sidebar, o usuário vê: página atual → spinner (100ms) → nova página. Parece "carregar duas vezes".

### Correção
Converter `AppLayout` em **layout route** do React Router (mount único):

```tsx
<Routes>
  <Route path="/auth" element={<Auth />} />
  {/* rotas públicas... */}
  <Route element={<AppLayoutRoute />}>   {/* usa <Outlet/> */}
    <Route path="/" element={<Index />} />
    <Route path="/estoque" element={<Estoque />} />
    {/* etc */}
  </Route>
</Routes>
```

E em `AppLayout` substituir `{children}` por `<Outlet />`. Remover também o `setTimeout(100ms)` artificial — usar apenas `loading` do `useAuth` para o spinner inicial.

Adicionar componente `ScrollToTop` (já é boa prática com múltiplas rotas).

## 2. Pente fino — Pré-publicação

### 2.1 Auditoria estática
- `tsc --noEmit` (build do harness) + `eslint`.
- Rodar `supabase--linter` e revisar findings críticos restantes (sem alterar nada que afete produção sem aprovação).
- Conferir que `cspReporter`, `consent` e `turnstile` (desligado) estão OK.

### 2.2 Testes automatizados (Vitest — já configurado)
Adicionar/garantir testes que cobrem fluxos sensíveis **sem tocar produção**:

- **Smoke render**: `App` renderiza sem crash em rota `/auth`, `/`, `/estoque`, `/receitas`, `/minha-privacidade`.
- **Navegação sem flash**: ao trocar de rota com `MemoryRouter`, `AppLayout` mantém mesmo instance (ref estável) e não dispara `loading` de novo.
- **CookieBanner**: aparece quando `consent` ausente, persiste escolha, não bloqueia render.
- **MinhaPrivacidade**: renderiza, botões de export/delete chamam edge function correta (mock).
- **CSP reporter**: continua enviando via `sendBeacon` (já existe).
- **Turnstile**: fail-open quando flag desligada (já existe).
- **Consent gate**: GA/analytics não dispara antes de aceite (verificar em `index.html` / lib).

### 2.3 Verificação manual via browser tool
- `/auth` carrega; signup/login form visível.
- Navegar `/` → `/estoque` → `/receitas` → `/precificacao` confirmando que **não há mais flash**.
- `/minha-privacidade` lista ações LGPD.
- `/admin/security` exibe dashboard (com user admin).
- Banner de cookies aparece em sessão limpa.

### 2.4 LGPD — checklist de conformidade
- [ ] Política de Privacidade, Termos, Cookies acessíveis sem login (`/politica-de-privacidade`, `/termos-de-uso`, `/cookies`).
- [ ] Cookie banner com opção granular + link para política.
- [ ] Página `/minha-privacidade` com export de dados + solicitação de deleção.
- [ ] Edge functions `export-my-data`, `request-account-deletion`, `purge-deleted-accounts` deployadas.
- [ ] Audit log com retenção (`cleanup-audit-logs`).
- [ ] CSP Report-Only ativo coletando.
- [ ] Tabela `csp_violations` com RLS.
- [ ] Nenhum dado sensível em logs do client.

## 3. Plano de rollback
- Mudança de rotas é **estritamente UI**. Rollback = reverter `App.tsx` e `AppLayout.tsx` ao commit anterior.
- Sem migrations. Sem mudança em Stripe/Auth/Storage/RLS.

## 4. Relatório final (após execução)
Entregarei:
- Lista de arquivos alterados (esperado: `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/components/ScrollToTop.tsx` novo, novos `*.test.tsx`).
- Resultados Vitest (passou/falhou).
- Checklist LGPD marcado.
- Score residual (Segurança app, LGPD, Regressão).
- Confirmação de zero impacto em Stripe/Auth/Storage/imagens.

## Detalhes técnicos
- `AppLayoutRoute` será wrapper fino: `const AppLayoutRoute = () => (<AppLayout><Outlet/></AppLayout>)`.
- Manter `AppLayout` aceitando `children` por compat, mas usar `<Outlet/>` quando children ausente.
- Remover `setTimeout(100)` e `isReady` — usar apenas `loading` do auth.
- Manter o handler de `hasAuthFragment` (necessário para callback OAuth).
- `ScrollToTop` registrado uma vez dentro do `BrowserRouter`.

## Fora do escopo (não fazer agora)
- Buckets privados (Fase A) — adiado.
- CSP enforce — manter Report-Only.
- Revogar grants de `anon` em funções `SECURITY DEFINER` — adiado (precisa auditoria por função).
- Turnstile real — continua scaffold desligado.
