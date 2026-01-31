
# Plano: Melhorias no Tratamento de Erros de Autenticação

## Problema Identificado

O Supabase, por questões de segurança (para evitar enumeração de emails), **não retorna erro quando um email já está cadastrado**. Em vez disso, retorna:

```json
{
  "data": {
    "user": {
      "identities": [],  // ← Array VAZIO indica email já existe
      "session": null
    }
  },
  "error": null  // ← Sem erro!
}
```

Isso explica porque você viu uma "descrição esquisita" - o sistema mostra sucesso quando na verdade o email já estava cadastrado.

---

## Solução

Verificar se `data.user?.identities` está vazio após o signup para detectar emails já cadastrados.

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Auth.tsx` | Melhorar tratamento de erros no `handleSignup` |

---

## Detalhes das Alterações

### 1. src/pages/Auth.tsx - Função `handleSignup`

**Antes (linhas 86-113):**
```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { error } = await signUp(email, password, fullName, businessName);
    
    if (error) {
      throw error;
    }
    
    toast({
      title: "Conta criada com sucesso!",
      description: "Verifique seu email...",
    });
    setShowResendConfirmation(true);
  } catch (error: any) {
    toast({
      title: "Erro ao criar conta",
      description: error.message || "Tente novamente",  // ← Mensagem genérica!
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

**Depois:**
```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data, error } = await signUp(email, password, fullName, businessName);
    
    if (error) {
      // Tratar erros específicos do Supabase
      let errorMessage = "Tente novamente";
      
      if (error.message.includes("Password should be at least")) {
        errorMessage = "A senha deve ter no mínimo 6 caracteres";
      } else if (error.message.includes("Unable to validate email")) {
        errorMessage = "Email inválido. Verifique o formato do email.";
      } else if (error.message.includes("Signup requires a valid password")) {
        errorMessage = "Digite uma senha válida";
      } else {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // IMPORTANTE: Verificar se identities está vazio = email já cadastrado
    if (data?.user?.identities?.length === 0) {
      toast({
        title: "Email já cadastrado",
        description: "Este email já possui uma conta. Tente fazer login ou recuperar sua senha.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Conta criada com sucesso!",
      description: "Verifique seu email para confirmar a conta. Não esqueça de verificar a pasta de spam.",
    });
    setShowResendConfirmation(true);
    
  } catch (error: any) {
    toast({
      title: "Erro inesperado",
      description: "Ocorreu um problema ao criar sua conta. Tente novamente.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

---

## Também precisa modificar

### 2. src/hooks/useAuth.tsx - Função `signUp`

Para retornar `data` além do `error`, precisamos modificar a função:

**Antes (linhas 99-114):**
```typescript
const signUp = async (email: string, password: string, fullName?: string, businessName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        business_name: businessName,
      }
    }
  });
  return { error };  // ← Só retorna error!
};
```

**Depois:**
```typescript
const signUp = async (email: string, password: string, fullName?: string, businessName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        business_name: businessName,
      }
    }
  });
  return { data, error };  // ← Retorna data E error
};
```

### 3. Atualizar o tipo no AuthContextType

Adicionar o tipo de retorno correto para a função `signUp`:

```typescript
signUp: (email: string, password: string, fullName?: string, businessName?: string) => Promise<{ data: any; error: any }>;
```

---

## Resumo das Mensagens de Erro Tratadas

| Situação | Mensagem Atual | Mensagem Nova |
|----------|----------------|---------------|
| Email já cadastrado | "Conta criada com sucesso!" (ERRADO) | "Email já cadastrado. Tente fazer login ou recuperar sua senha." |
| Senha muito curta | Texto técnico em inglês | "A senha deve ter no mínimo 6 caracteres" |
| Email inválido | Texto técnico em inglês | "Email inválido. Verifique o formato do email." |
| Erro genérico | "Tente novamente" | "Ocorreu um problema ao criar sua conta. Tente novamente." |

---

## Resultado Esperado

```text
ANTES:                              DEPOIS:
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ Email já existe → "Sucesso!"│     │ Email já existe → ERRO      │
│ (mostra tela de confirmação)│     │ "Email já cadastrado"       │
├─────────────────────────────┤     ├─────────────────────────────┤
│ Erros em inglês            │     │ Erros traduzidos            │
│ "Password should be..."    │     │ "A senha deve ter..."       │
└─────────────────────────────┘     └─────────────────────────────┘
```

---

## Segurança

- Nenhuma alteração no banco de dados
- Nenhuma alteração em Edge Functions
- Apenas melhorias na UX de tratamento de erros
