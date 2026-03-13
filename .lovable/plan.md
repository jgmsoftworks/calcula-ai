# Plano: Refatorar CMV do Dashboard — Cálculo Real com Fechamento Mensal

## Problema Atual

O CMV está sendo calculado com a lógica:

**EI = EF + Saídas - Compras**

Isso faz a fórmula colapsar para:

**CMV = totalSaidasCusto**

Ou seja, o sistema não está calculando um **CMV real**; está apenas chegando, por identidade algébrica, ao valor das saídas a custo.

---

## Objetivo da Refatoração

Implementar um **CMV mensal real**, com base em:

**CMV = Estoque Inicial + Compras Líquidas - Estoque Final**

Com estas premissas:

- o **estoque inicial** deve ser um valor real, vindo do fechamento do mês anterior
- o sistema deve exibir:
  - **CMV em R$**
  - **CMV em %**
  - **breakdown transparente do cálculo**
- se não houver fechamento anterior, o sistema **não deve inventar EI**
- nesse caso, o card deve exibir que o **CMV está indisponível** até existir base válida

---

# Solução

## 1. Nova tabela: `estoque_fechamentos_mensais`

Criação via migration:

```
CREATE TABLE public.estoque_fechamentos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competencia text NOT NULL, -- formato YYYY-MM
  valor_estoque_fechamento numeric NOT NULL DEFAULT 0,
  qtd_produtos_ativos integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, competencia)
);

ALTER TABLE public.estoque_fechamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus fechamentos"
  ON public.estoque_fechamentos_mensais
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Finalidade

Essa tabela armazenará o valor do estoque fechado por competência mensal.

### Regra

O **estoque inicial do mês atual** será sempre o:

**valor_estoque_fechamento da competência anterior**

Exemplo:

- competência atual: `2026-03`
- estoque inicial do mês: fechamento de `2026-02`

---

## 2. Novo arquivo: `src/lib/cmvCalculations.ts`

Criar um arquivo exclusivo para concentrar a lógica do CMV, com funções isoladas e reutilizáveis.

### Funções previstas

#### `getCurrentMonthRangeBrasilia()`

Responsável por:

- pegar a data atual
- converter para `America/Sao_Paulo`
- gerar:
  - início do mês às 00:00:00
  - momento atual
- converter ambos para UTC antes das queries

---

#### `calculateEstoqueFinal(produtos)`

Calcula o estoque final atual com base nos produtos ativos.

**Fórmula:**

```
SUM(estoque_atual * custo_unitario)
```

Considerar apenas:

- `user_id = usuário logado`
- `ativo = true`

---

#### `calculateComprasLiquidas(entradas)`

Calcula as compras líquidas do mês com base nas entradas válidas.

### Regras:

Somar entradas normais a custo:

```
custo_aplicado * quantidade
```

Excluir entradas cujo motivo contenha, de forma case-insensitive:

- ajuste
- inventário
- transferência
- bonificação
- cancelamento

Se o motivo contiver:

- `devolução`
- e `fornecedor`

então o valor deve ser **subtraído** do total de compras.

---

#### `getEstoqueInicialReal(userId, competenciaAnterior)`

Busca o fechamento do mês anterior na tabela `estoque_fechamentos_mensais`.

### Regra:

- se existir fechamento, retornar o valor
- se não existir, retornar `null`

### Importante:

Essa função **não deve criar estimativa**, nem reconstruir EI por fórmula indireta.

---

#### `calculateCMVValor(ei, compras, ef)`

Calcula o CMV em valor.

**Fórmula:**

```
cmv = ei + compras - ef
```

---

#### `calculateCMVPercentual(cmv, faturamento)`

Calcula o CMV em percentual.

**Fórmula:**

```
cmvPercentual = (cmv / faturamento) * 100
```

### Regra:

Se faturamento for:

- `0`
- `null`
- `undefined`

retornar `null`.

---

#### `getFaturamentoLiquidoMes(userId, start, end)`

Função para buscar o faturamento líquido do mês.

### Diretriz:

- se já existir uma fonte confiável de faturamento, usar essa fonte
- se ainda não existir modelagem correta de faturamento, deixar a função preparada para integração futura

### Regra importante:

Não tratar “qualquer saída” como faturamento.  
  
Se for necessário usar uma regra provisória, ela deve estar claramente delimitada e documentada.

---

## 3. Refatorar `src/hooks/useDashboardData.tsx`

Refatorar o hook para usar a nova lógica centralizada.

### Alterações

- importar funções de `cmvCalculations.ts`
- buscar o fechamento da competência anterior em `estoque_fechamentos_mensais`
- buscar o faturamento líquido do mês
- calcular:
  - estoque inicial
  - compras líquidas
  - estoque final
  - CMV em valor
  - CMV em percentual

### Novos campos em `DashboardData`

```
cmvDisponivel: boolean
cmvPercentual: number | null
cmvBreakdown: {
  estoqueInicial: number | null
  comprasLiquidas: number
  estoqueFinal: number
  faturamentoLiquido: number | null
}
```

### Regra crítica

Se **não existir fechamento do mês anterior**:

- `cmvDisponivel = false`
- não calcular CMV com proxy
- não usar EF atual como EI
- não exibir valor “estimado” inventado

Nesse cenário, o sistema deve informar que:

**o CMV do mês atual depende do fechamento do mês anterior**

---

## 4. Novo componente: `src/components/dashboard/CmvCard.tsx`

Criar um card dedicado para o CMV.

### Estrutura visual

- valor principal grande em R$
- badge ao lado com CMV %
- subtítulo curto
- tooltip ou popover com breakdown detalhado
- visual consistente com os demais cards do dashboard

### Conteúdo do card

#### Quando houver base válida:

- **Título:** `CMV (mês atual)`
- **Valor principal:** `R$ X.XXX,XX`
- **Badge:** `XX,X%`
- **Subtítulo:** `Estoque Inicial + Compras − Estoque Final`

#### No detalhamento:

- Estoque inicial: R$ X
- (+) Compras líquidas: R$ Y
- (−) Estoque final: R$ Z
- (=) CMV: R$ W
- Faturamento líquido: R$ K
- CMV %: P%

---

### Quando não houver fechamento anterior

O card deve exibir estado de indisponibilidade, por exemplo:

- **Título:** `CMV (mês atual)`
- **Valor:** `Indisponível`
- **Mensagem auxiliar:** `Aguardando fechamento do estoque do mês anterior`

### Importante

Não exibir valor calculado com estimativa fraca.  
  
Se a base não existir, o sistema deve ser honesto e mostrar indisponibilidade.

---

## 5. Atualizar `Dashboard.tsx`

### Alteração

Substituir o card genérico atual de CMV por:

```
<CmvCard />
```

E manter os demais cards normalmente:

- Valor em Estoque
- Saídas
- outros cards existentes

---

# Como o sistema decide se o CMV pode ser calculado

## Regra

1. Buscar em `estoque_fechamentos_mensais` o registro da competência anterior
2. Se encontrar:
  - usar como `Estoque Inicial`
  - `cmvDisponivel = true`
3. Se não encontrar:
  - `cmvDisponivel = false`
  - não calcular CMV
  - exibir estado de indisponibilidade no card

---

# Como cadastrar ou gerar o fechamento mensal

O sistema deve permitir, inicialmente, um fechamento manual.

## Regra do fechamento

Ao executar o fechamento de uma competência, salvar:

```
SUM(estoque_atual * custo_unitario)
```

dos produtos ativos daquele usuário no momento da execução.

## Resultado salvo

- competência
- valor do estoque fechado
- quantidade de produtos ativos
- timestamps

## Observação

A arquitetura deve ficar pronta para automação futura via:

- cron
- edge function
- job agendado

Mas o cálculo do CMV já deve funcionar corretamente com fechamento manual.

---

# Arquivos alterados/criados


| Arquivo                                   | Ação                             |
| ----------------------------------------- | -------------------------------- |
| `migration - estoque_fechamentos_mensais` | Criar tabela + RLS               |
| `src/lib/cmvCalculations.ts`              | Criar lógica isolada do CMV      |
| `src/hooks/useDashboardData.tsx`          | Refatorar para usar cálculo real |
| `src/components/dashboard/CmvCard.tsx`    | Criar card dedicado              |
| `src/pages/Dashboard.tsx`                 | Atualizar para usar `CmvCard`    |


---

# Critérios obrigatórios de aceitação

## O plano só será considerado correto se cumprir tudo abaixo:

- não reconstituir EI por `EF + saídas - compras`
- não usar `EF atual` como proxy de `EI`
- não exibir CMV “estimado” com base frágil
- calcular CMV apenas quando houver fechamento anterior válido
- exibir CMV em valor e percentual
- exibir breakdown transparente
- tratar ausência de base com mensagem clara de indisponibilidade
- deixar a arquitetura pronta para fechamento mensal confiável

---

# Resumo final

A refatoração correta é esta:

- criar **fechamento mensal de estoque**
- usar o fechamento anterior como **estoque inicial real**
- calcular:
  - **CMV = EI + Compras Líquidas - EF**
  - **CMV% = CMV / Faturamento Líquido**
- mostrar o número somente quando houver base válida
- quando não houver fechamento anterior, mostrar **indisponível**, e não uma estimativa artificial
- &nbsp;