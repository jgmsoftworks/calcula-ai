

## Plano: Completar i18n + Melhorar Seletor de Idioma

### Problemas identificados
1. **Seletor de idioma ruim**: Botão atual só mostra "PT"/"EN" e alterna direto. O usuário quer um dropdown com lista de idiomas para selecionar.
2. **Strings não traduzidas**: A maioria dos componentes internos ainda tem texto hardcoded em português (~49 arquivos com strings não traduzidas).

### 1. Novo Seletor de Idioma (Dropdown)
Trocar o botão toggle por um `DropdownMenu` no header que mostra os idiomas disponíveis com bandeira/nome:
- 🇧🇷 Português (BR)
- 🇺🇸 English

O botão mostra a bandeira do idioma atual. Ao clicar, abre a lista para selecionar.

### 2. Traduzir todos os componentes restantes

**Arquivos de tradução** (`en.json` e `pt-BR.json`): Expandir massivamente com seções para cada área:

```
receitas.*        → ListaReceitas, ReceitaCard, ReceitaForm, ExportMarkupModal, tabs, labels financeiros
estoque.*         → ListaProdutos, filtros, tabela, badges, botões, ProdutoForm
movimentacao.*    → CarrinhoMovimentacao, MovimentacaoModal, ListaProdutos, motivos
custos.*          → DespesasFixas, FolhaPagamento, EncargosVenda
precificacao.*    → Markups, MediaFaturamento
perfil.*          → PerfilNegocio campos e labels
notifications.*   → NotificacoesPainel
```

**Componentes a traduzir** (lista dos principais — todos os ~49 arquivos com strings hardcoded):

| Área | Arquivos |
|------|----------|
| Receitas | ListaReceitas, ReceitaCard, ReceitaForm, ExportMarkupModal, GeralTab, IngredientesTab, SubReceitasTab, EmbalagensTa, ProjecaoTab, PrecificacaoTab, HistoricoGeralReceitas, ReceitaPreviewModal, TiposProdutoModal, MaoObraModal, MarkupCard |
| Estoque | ListaProdutos, ProdutoForm, HistoricoGeral, ImportProdutosExcel, CategoriasModal, MarcasModal |
| Movimentação | CarrinhoMovimentacao, MovimentacaoModal, ListaProdutos, ItemCarrinho, ProdutoCard, CategoriasFiltro |
| Custos | DespesasFixas, FolhaPagamento, EncargosVenda, CategoriasDespesasModal |
| Precificação | Markups, MediaFaturamento, CustosModal |
| Perfil | PerfilNegocio |
| Notificações | NotificacoesPainel, NotificationCenter, NotificationSettings |
| Outros | Checkout, Tutorial, AdminUsers, hooks (useMovimentacoes, usePlanLimits toasts) |

**Dados dinâmicos** (motivos de movimentação):
- `src/lib/motivosMovimentacao.ts` — converter para usar chaves i18n ao invés de strings fixas em português

### 3. Detalhes técnicos

- **Seletor**: `DropdownMenu` do shadcn/ui com `DropdownMenuRadioGroup` para seleção do idioma
- **Padrão de tradução**: `useTranslation()` + `t('section.key')` em cada componente
- **Dados do usuário preservados**: Nomes de produtos, receitas, etc. que o usuário digitou continuam como estão — só labels de UI são traduzidos
- **Motivos de movimentação**: Transformar em chaves i18n mapeadas para traduções, mantendo compatibilidade com dados já salvos no banco

### Arquivos modificados
- `src/i18n/locales/en.json` — expandir com ~300+ novas chaves
- `src/i18n/locales/pt-BR.json` — expandir com ~300+ novas chaves correspondentes
- `src/components/layout/AppLayout.tsx` — trocar toggle por dropdown
- `src/lib/motivosMovimentacao.ts` — adaptar para i18n
- ~40 componentes em `src/components/` e `src/pages/` — adicionar `useTranslation()` e substituir strings hardcoded

