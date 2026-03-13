

## Solução: Desabilitar Bot Protection no Supabase

O problema é que o CAPTCHA está ativado no Supabase mas o frontend não envia o token. A solução mais simples é **desabilitar**.

### Ação necessária (feita por você no dashboard)

1. Acesse o **Supabase Dashboard**
2. Vá em **Authentication → Bot Protection**
3. **Desabilite** o CAPTCHA / Bot Protection
4. Salve

Nenhuma alteração de código é necessária. O login voltará a funcionar imediatamente após desabilitar.

