

## Plano: Internacionalização (pt-BR + Inglês)

### Resumo
Adicionar suporte a dois idiomas (Português BR e Inglês) usando `react-i18next`, com um botão de troca no header ao lado do tema escuro/claro.

### Como vai funcionar
- Um botão no header com a bandeira/sigla do idioma atual (🇧🇷 PT / 🇺🇸 EN)
- Ao clicar, alterna entre português e inglês
- A preferência fica salva no localStorage

### Escopo da tradução

O sistema tem **30+ arquivos** com textos hardcoded em português. A implementação será feita em fases:

**Fase 1 (esta implementação):**
- Infraestrutura i18n completa (react-i18next + arquivos de tradução)
- Botão de troca no header
- Tradução de todas as áreas de navegação: sidebar, header, page titles
- Tradução das páginas principais: Dashboard, Estoque, Receitas, Custos, Precificação, Movimentação, Planos, Perfil, Tutorial, Auth
- Tradução de componentes compartilhados: toasts, alertas, modais de confirmação, botões comuns

### Detalhes técnicos

**1. Instalar dependências**
- `react-i18next` + `i18next` + `i18next-browser-languagedetector`

**2. Criar arquivos de tradução**
```
src/i18n/
  index.ts          ← configuração do i18next
  locales/
    pt-BR.json      ← todas as strings em português
    en.json          ← todas as strings em inglês
```

As traduções serão organizadas por namespace/seção:
```json
{
  "nav": { "dashboard": "Dashboard", "estoque": "Inventory", ... },
  "dashboard": { "title": "Dashboard", "monthlyRevenue": "Monthly Revenue", ... },
  "common": { "save": "Save", "cancel": "Cancel", "delete": "Delete", ... },
  "auth": { "login": "Login", "signup": "Sign Up", ... },
  "plans": { "free": "Free", "professional": "Professional", ... },
  ...
}
```

**3. Inicializar no App.tsx**
- Importar `src/i18n/index.ts` antes do render

**4. Botão de idioma no header (AppLayout.tsx)**
- Ícone `Languages` do lucide-react ou bandeiras
- Posicionado entre o tema e o tutorial
- Tooltip mostrando o idioma atual

**5. Atualizar componentes**
- Substituir strings hardcoded por `t('chave')` usando o hook `useTranslation()`
- Componentes afetados: AppSidebar, AppLayout, todas as pages, formulários, modais, toasts

**6. Formatação de números e datas**
- Manter BRL para valores monetários (o sistema é brasileiro)
- Datas formatadas conforme o idioma selecionado

### Arquivos criados
- `src/i18n/index.ts`
- `src/i18n/locales/pt-BR.json`
- `src/i18n/locales/en.json`

### Arquivos modificados (principais)
- `src/App.tsx` — import do i18n
- `src/components/layout/AppLayout.tsx` — botão de idioma + uso de `t()`
- `src/components/layout/AppSidebar.tsx` — labels traduzidos
- `src/pages/*.tsx` — todas as páginas com `useTranslation()`
- `src/hooks/usePlanLimits.tsx` — mensagens traduzidas
- `src/components/**/*.tsx` — componentes com textos visíveis

