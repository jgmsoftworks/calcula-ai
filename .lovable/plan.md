## Objetivo
Eliminar a poluição de `console.log` (especialmente do `[MARKUP INITIALIZER]` que dispara repetidamente) sem remover a capacidade de debugar e sem mudar o comportamento funcional.

## Diagnóstico
No print do DevTools aparece em loop:
- `[MARKUP INITIALIZER] Usuário logado, inicializando markups...`
- `[MARKUP INITIALIZER] Inicializando markups automaticamente...`
- `[MARKUP INITIALIZER] Nenhum bloco encontrado`

Causa: `src/hooks/useMarkupInitializer.tsx` tem ~15 `console.log` espalhados e o `useEffect` re-dispara várias vezes (dependência `inicializarMarkups` recriada). Além disso há `console.log/error` em vários outros hooks/components.

## Estratégia (sem mexer em lógica)

### 1. Criar um logger central — `src/lib/logger.ts`
- `logger.debug/info/warn/error` com namespace.
- Ligado/desligado por:
  - `import.meta.env.DEV` (auto-on em dev)
  - flag manual via `localStorage.setItem('debug','markup,auth,*')` para ligar pontualmente em produção
- `error` e `warn` **sempre** passam (não perdemos sinal de problemas reais).
- `debug/info` ficam silenciados em produção por padrão.

### 2. Trocar os `console.log` ruidosos por `logger.debug`
Apenas substituição de chamadas — zero mudança de fluxo:
- `src/hooks/useMarkupInitializer.tsx` (origem do spam no print)
- Outros arquivos com `console.log` de rotina (ex.: hooks de dados, inicializadores). Manter `console.error` críticos ou trocar por `logger.error`.

### 3. Estabilizar o `useEffect` do markup initializer
O efeito hoje depende de `inicializarMarkups` (recriado quando `loadConfiguration` muda → dispara repetido). Ajuste mínimo:
- Manter a função, mas no `useEffect` depender só de `user?.id`.
- Manter o guard `isInitializing.current` que já existe.
Resultado: roda 1x por sessão de login, não em loop. **Não muda nenhuma regra de negócio.**

### 4. Como ligar logs quando precisar
- Dev local: tudo aparece automaticamente.
- Produção: abrir DevTools → `localStorage.debug = '*'` → reload. Para desligar: `localStorage.removeItem('debug')`.

## Arquivos afetados
- **novo:** `src/lib/logger.ts`
- **editado:** `src/hooks/useMarkupInitializer.tsx` (logs + deps do useEffect)
- **editado (opcional, no mesmo passo):** trocar `console.log` mais barulhentos em hooks de dados por `logger.debug`

## Fora do escopo
- Não mexer em Auth, Stripe, RLS, Storage, CSP, migrações.
- Não remover `console.error` que indicam falha real.
- Não alterar a lógica de cálculo de markup.

## Risco
Baixo. Mudança puramente de observabilidade + 1 ajuste de dependência de `useEffect` (que já tem proteção via ref).
