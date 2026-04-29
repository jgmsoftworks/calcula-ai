Vou fazer um pente fino no controle de limite de markups e corrigir a causa do bloqueio indevido.

Diagnóstico encontrado:
- Existem duas versões da função `check_plan_limits` no Supabase:
  - uma recebe `feature_type text` e ainda conta todos os markups ativos, incluindo `sub_receita`;
  - outra recebe `feature_type varchar` e já exclui `sub_receita`.
- O frontend chama `supabase.rpc('check_plan_limits', { feature_type: 'markups' })`, e pode estar caindo na versão antiga/errada dependendo da resolução do PostgREST/Supabase.
- Por isso, o bloco fixo de subreceita pode estar consumindo o limite do plano Free, e usuários Professional/Enterprise podem receber bloqueio inconsistente.
- Também há risco na UI: o contador visual usa os blocos locais, mas a validação usa o RPC. Se os dois não estiverem alinhados, aparece “Recurso bloqueado” mesmo quando o plano permite.

Plano de correção:

1. Unificar a função de limite no banco
- Criar uma migração para remover a sobrecarga antiga `check_plan_limits(uuid, text, integer)` ou substituí-la pela lógica correta.
- Manter apenas uma lógica confiável para `markups`:
  - Free: 1 bloco normal
  - Professional: 3 blocos normais
  - Enterprise: ilimitado
  - `tipo = 'sub_receita'` nunca conta no limite
- Preservar a regra já existente de admin/acesso no frontend, sem mexer em roles.

2. Blindar a contagem de markups
- No RPC, contar apenas:
  - `ativo = true`
  - `tipo IS DISTINCT FROM 'sub_receita'`
- Isso evita erro caso algum registro antigo tenha `tipo` nulo.
- Opcionalmente normalizar registros existentes de subreceita para `tipo = 'sub_receita'` quando o nome/id indicar subreceita, sem contar como bloco pago.

3. Corrigir o frontend em `Markups.tsx`
- Antes de chamar `checkLimit('markups')`, calcular quantos blocos normais já existem no estado local, excluindo `subreceita-fixo` e qualquer bloco com nome/tipo de subreceita.
- Passar a tentativa de criação como `feature_count = 1`, mas garantir que a tela mostra e valida a quantidade correta.
- Alterar o nome padrão do novo bloco para não contar a subreceita: hoje `Markup ${blocos.length + 1}` considera o bloco fixo; vou usar a quantidade de blocos normais + 1.

4. Ajustar mensagens de bloqueio
- Quando for limite atingido, mostrar mensagem clara com o plano detectado e o limite correto.
- Evitar mensagem genérica “disponível apenas no plano Empresarial” quando o plano atual já deveria permitir.

5. Revisar inicialização automática
- Em `useMarkupInitializer`, garantir que o bloco fixo de subreceita continue sendo salvo como `tipo = 'sub_receita'` e markup 1.0.
- Garantir que qualquer bloco de subreceita não entre como bloco de markup normal.

6. Validar no banco
- Testar o RPC para contas Free, Professional e Enterprise.
- Conferir especificamente a conta enterprise atual e casos com apenas subreceita:
  - Enterprise deve retornar `allowed: true` sempre.
  - Professional com 0, 1, 2 blocos normais deve permitir criar até 3.
  - Free com apenas subreceita deve permitir criar 1 bloco normal.
  - Free com 1 bloco normal deve bloquear o segundo.

Arquivos previstos:
- `supabase/migrations/...sql` para corrigir/unificar `check_plan_limits`.
- `src/components/precificacao/Markups.tsx` para alinhar contador/validação local.
- `src/hooks/useMarkupInitializer.tsx` se necessário para reforçar a classificação de subreceita.

Resultado esperado:
- Subreceita fica liberada para todos e nunca consome limite.
- Plano Free consegue criar 1 bloco de markup normal.
- Plano Professional consegue criar 3 blocos normais.
- Plano Enterprise consegue criar blocos ilimitados.
- A mensagem de bloqueio só aparece quando o limite real do plano for atingido.