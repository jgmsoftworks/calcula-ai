

## Plano: Screenshots reais do CalculaAi para o Tutorial

### Problema
As imagens do tutorial sao genericas/inventadas. O usuario quer prints reais das telas do CalculaAi.

### Solucao

Usar as ferramentas de browser para navegar em cada tela do sistema, tirar screenshots reais, e salvar como assets do tutorial. Depois atualizar o Tutorial.tsx para usar essas imagens.

### Passo a passo

**1. Capturar screenshots reais de cada tela**
Navegar pelo app publicado e tirar screenshot de:
- `/` (Dashboard)
- `/estoque` (Estoque)
- `/movimentacao` (Movimentacao)
- `/receitas` (Receitas)
- `/custos` (Custos)
- `/precificacao` (Precificacao)
- `/perfil` (Perfil do Negocio)
- `/planos` (Planos)
- `/notificacoes` (Notificacoes)

Usar o product-shot generator para dar acabamento visual (moldura macOS + gradiente de fundo combinando com a cor da secao).

**2. Substituir os assets em `src/assets/tutorial/`**
Trocar os 6 JPGs existentes pelos screenshots reais e adicionar novos para Perfil, Planos e Notificacoes.

**3. Adicionar secoes que faltam no Tutorial.tsx**
Incluir secoes para Perfil do Negocio, Planos e Notificacoes com textos explicativos e os prints reais.

### Arquivos envolvidos
- `src/assets/tutorial/*.jpg` — substituir por screenshots reais
- `src/pages/Tutorial.tsx` — adicionar secoes faltantes (Perfil, Planos, Notificacoes)

