

# Plano: Resolver Problemas de Login/Cadastro de Novos Usuarios

## Problema

Novos usuarios se cadastram mas nao conseguem confirmar o email ou fazer login, obrigando o admin a confirmar manualmente. Dois problemas principais:

1. **Emails de confirmacao do Supabase nao chegam** (rate limit do Supabase: 3 emails/hora no plano gratuito de email)
2. **Na tela de login, quando o erro e "Email nao confirmado", nao tem botao para reenviar** - o botao de reenvio so aparece na aba de cadastro

## Solucao

Duas frentes: melhorar a UX para lidar com emails nao confirmados + adicionar opcao de desabilitar confirmacao de email.

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/Auth.tsx` | Adicionar botao "Reenviar confirmacao" no login quando erro de email nao confirmado |

---

## Detalhes

### 1. Auth.tsx - Melhorar fluxo de "Email nao confirmado"

**No handleLogin (linha 46-84):**
- Quando o erro for "Email not confirmed", alem da mensagem de erro, mostrar um bloco com:
  - Input pre-preenchido com o email usado no login
  - Botao "Reenviar email de confirmacao"
  - Instrucoes claras ("Verifique sua caixa de entrada e pasta de spam")

Adicionar estado `showLoginResend` e logica para reenviar a partir da aba de login.

**No handleLogin, trecho do erro "Email not confirmed":**
```typescript
} else if (error.message.includes("Email not confirmed")) {
  errorMessage = "Seu email ainda nao foi confirmado. Verifique sua caixa de entrada e spam.";
  setShowLoginResend(true); // NOVO: mostrar botao de reenvio
}
```

**Novo bloco visual apos o botao "Esqueceu sua senha?":**
```tsx
{showLoginResend && (
  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
    <p className="text-sm text-amber-800 font-medium">
      Email nao confirmado
    </p>
    <p className="text-xs text-amber-700">
      Verifique sua caixa de entrada e pasta de spam. Se nao encontrar, reenvie abaixo.
    </p>
    <Button onClick={handleLoginResend} disabled={loading} variant="outline" size="sm">
      <RefreshCw className="h-4 w-4 mr-2" />
      Reenviar email de confirmacao
    </Button>
  </div>
)}
```

**Nova funcao `handleLoginResend`:**
- Usa `resendConfirmation(loginEmail)` com o email que ja esta preenchido no campo de login
- Mostra toast de sucesso/erro

### 2. Sugestao ao usuario (nao e codigo)

Recomendar ao usuario ir nas configuracoes do Supabase Dashboard e:
- **Opcao A**: Configurar um email customizado (SMTP) para melhor entrega
- **Opcao B**: Desabilitar "Confirm email" em Authentication > Providers > Email se nao quiser exigir confirmacao

---

## Resultado

```text
ANTES (login com email nao confirmado):
┌─────────────────────────────────┐
│ ❌ "Email ou senha incorretos" │  ← mensagem vaga
│ (sem opcao de reenvio)          │
└─────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────┐
│ ⚠️ "Email nao confirmado"      │
│ Verifique inbox e spam.         │
│ [Reenviar email de confirmacao] │  ← botao funcional
└─────────────────────────────────┘
```

