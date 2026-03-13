

## Diagnóstico

O Supabase está configurado com verificação CAPTCHA (provavelmente Cloudflare Turnstile ou hCaptcha), mas o frontend não inclui o widget nem envia o `captcha_token` nas chamadas de `signInWithPassword` e `signUp`. Resultado: **nenhum usuário consegue logar**.

## Solução

**Opção mais simples: Desabilitar o CAPTCHA no Supabase Dashboard.**

Se o CAPTCHA não é necessário, basta ir em:
- Supabase Dashboard → Authentication → Bot Protection → Desabilitar

**Opção alternativa: Integrar o CAPTCHA no frontend.**

Isso requer:
1. Instalar o pacote do provider (ex: `@marsidev/react-turnstile` para Cloudflare Turnstile)
2. Adicionar o widget na tela de Auth (`src/pages/Auth.tsx`)
3. Passar o `captchaToken` nas opções de `signIn` e `signUp` no `useAuth.tsx`:
   ```typescript
   await supabase.auth.signInWithPassword({
     email, password,
     options: { captchaToken }
   });
   ```

## Recomendação

A solução mais rápida é **desabilitar o CAPTCHA no dashboard do Supabase**, já que o app nunca teve essa integração. Se quiser manter o CAPTCHA, implemento a integração no frontend.

### Ação necessária do usuário

Acesse o painel do Supabase e desabilite o CAPTCHA em Authentication → Bot Protection, ou me diga que quer integrar o CAPTCHA no frontend que eu faço o plano detalhado.

