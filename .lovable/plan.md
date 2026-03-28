

## Plano: Botão "Exportar PDF" no Tutorial

### Resumo
Adicionar um botão na página de Tutorial que gera um PDF completo e bonito com todo o conteúdo: seções, imagens, descrições, bullets e dicas. Cuidado especial com divisórias de página para não cortar conteúdo.

### Como vai funcionar
- Botão "Baixar PDF" no topo da página do Tutorial (ao lado do hero)
- Gera um PDF A4 portrait usando `jsPDF` (já instalado no projeto)
- Conteúdo completo: capa, 6 seções com todas as 17 sub-telas, imagens, bullets e tips

### Estrutura do PDF

```text
┌─────────────────────────┐
│       CAPA              │
│  Logo gradient header   │
│  "Guia Completo"        │
│  "CalculaAi"            │
│  Data de geração        │
└─────────────────────────┘
┌─────────────────────────┐
│  SEÇÃO: Dashboard       │
│  ─── barra colorida ─── │
│  Ícone + título         │
│  Intro text             │
│                         │
│  Sub-tela 1:            │
│  [imagem screenshot]    │
│  Descrição              │
│  • bullet 1             │
│  • bullet 2             │
│  💡 tip                 │
│  ─── separador ───      │
│  Sub-tela 2: ...        │
└─────────────────────────┘
   ... repete para cada seção
```

### Detalhes técnicos

**1. Novo hook `useExportTutorialPDF.ts`**
- Usa `jsPDF` para gerar o PDF
- Carrega imagens dos assets via fetch → base64 para embedding
- Controle inteligente de page breaks: antes de cada sub-tela, verifica se há espaço suficiente na página; se não, pula para próxima
- Barra colorida no topo de cada seção (usando o gradient da seção)
- Bullets com marcadores visuais, tips com fundo destacado
- Formatação de `**bold**` nos bullets (split por `**` como já feito no React)

**2. Modificar `Tutorial.tsx`**
- Importar o hook
- Adicionar botão "📄 Baixar PDF" no hero ou logo abaixo dele
- Loading state durante geração

### Cuidados com page breaks
- Antes de renderizar cada sub-tela, calcular altura estimada (título + imagem + descrição + bullets + tips)
- Se não cabe na página atual, `addPage()` antes
- Imagens redimensionadas para caber na largura útil (max ~170mm) mantendo proporção
- Margem segura de 20mm em todos os lados

### Arquivos
- **Criar**: `src/hooks/useExportTutorialPDF.ts`
- **Modificar**: `src/pages/Tutorial.tsx` (adicionar botão)

