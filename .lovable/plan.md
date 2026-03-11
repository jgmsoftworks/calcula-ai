
# Plano: Duplicar Receita

## Resumo
Adicionar um botao de "Duplicar" ao lado dos botoes existentes no card da receita. Ao clicar, o sistema copia a receita completa (ingredientes, embalagens, sub-receitas, mao de obra, passos de preparo) com o nome `"Nome Original (Cópia)"`, garantindo que nao haja nomes duplicados.

---

## Como vai funcionar

1. Usuario clica no botao de duplicar (icone de copia)
2. O sistema busca a receita completa (ingredientes, embalagens, sub-receitas, mao de obra, passos)
3. Gera um nome unico: `"Nome (Cópia)"`, ou `"Nome (Cópia 2)"` se ja existir
4. Cria a receita nova com numero sequencial novo
5. Copia todos os itens relacionados (ingredientes, embalagens, sub-receitas, mao de obra, passos)
6. Atualiza a lista automaticamente

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/hooks/useReceitas.ts` | Adicionar funcao `duplicarReceita` |
| `src/components/receitas/ReceitaCard.tsx` | Adicionar botao de duplicar |
| `src/components/receitas/ListaReceitas.tsx` | Passar callback de reload |

---

## Detalhes Tecnicos

### 1. `src/hooks/useReceitas.ts` - Nova funcao `duplicarReceita`

Adicionar funcao que:
- Busca a receita completa via `fetchReceitaCompleta`
- Verifica nomes existentes para gerar nome unico (ex: "Bolo (Cópia)", "Bolo (Cópia 2)")
- Cria nova receita com `createReceita` (gera novo numero sequencial)
- Copia em batch: `receita_ingredientes`, `receita_embalagens`, `receita_sub_receitas`, `receita_mao_obra`, `receita_passos_preparo`
- NAO copia a imagem (cada receita deve ter sua propria imagem)

Logica para nome unico:
```
1. Nome base = "Nome Original (Cópia)"
2. Buscar receitas do usuario com nome LIKE "Nome Original (Cópia%"
3. Se nenhuma existe -> usar "Nome Original (Cópia)"
4. Se ja existe -> usar "Nome Original (Cópia 2)", "Nome Original (Cópia 3)", etc.
```

### 2. `src/components/receitas/ReceitaCard.tsx`

- Importar icone `Copy` do lucide-react
- Adicionar botao entre o botao de Edit e o AlertDialog de Delete
- Chamar `duplicarReceita` ao clicar
- Mostrar loading durante a duplicacao
- Chamar `onDelete` (que recarrega a lista) apos duplicar com sucesso

### 3. `src/components/receitas/ListaReceitas.tsx`

Nenhuma mudanca necessaria - o `onDelete` ja faz reload da lista, e o real-time subscription tambem captura o INSERT.

---

## Tabelas envolvidas na copia

| Tabela | O que copiar |
|--------|-------------|
| `receitas` | Todos os campos exceto `id`, `numero_sequencial`, `imagem_url`, `created_at`, `updated_at` |
| `receita_ingredientes` | `produto_id`, `quantidade` |
| `receita_embalagens` | `produto_id`, `quantidade` |
| `receita_sub_receitas` | `sub_receita_id`, `quantidade` |
| `receita_mao_obra` | `funcionario_id`, `funcionario_nome`, `funcionario_cargo`, `tempo`, `unidade_tempo`, `custo_por_hora`, `valor_total` |
| `receita_passos_preparo` | `ordem`, `descricao` (sem imagem) |

---

## Seguranca

- Nenhuma alteracao no banco de dados (schema)
- Nenhuma alteracao em Edge Functions
- RLS policies ja cobrem INSERT para todas as tabelas envolvidas
- A receita duplicada pertence ao mesmo usuario
