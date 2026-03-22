import {
  Home,
  Package,
  TrendingUp,
  ChefHat,
  DollarSign,
  Calculator,
  Building2,
  BarChart3,
  ShoppingCart,
  Layers,
  Settings,
  CreditCard,
  Sparkles,
  MousePointerClick,
  CheckCircle2,
  LucideIcon,
  Clock,
  ImageIcon,
  Utensils,
  Scale,
  PieChart,
  FileText,
  Users,
  Percent,
  Target,
} from 'lucide-react';

// Images
import dashboardImg from '@/assets/tutorial/dashboard-preview.jpg';
import estoqueImg from '@/assets/tutorial/estoque-preview.jpg';
import estoqueCriarImg from '@/assets/tutorial/estoque-criar-produto.jpg';
import estoqueModoUsoImg from '@/assets/tutorial/estoque-modo-uso.jpg';
import movimentacaoImg from '@/assets/tutorial/movimentacao-preview.jpg';
import movimentacaoModalImg from '@/assets/tutorial/movimentacao-modal.jpg';
import receitasImg from '@/assets/tutorial/receitas-preview.jpg';
import receitaGeralImg from '@/assets/tutorial/receita-geral.jpg';
import receitaIngredientesImg from '@/assets/tutorial/receita-ingredientes.jpg';
import receitaSubReceitasImg from '@/assets/tutorial/receita-subreceitas.jpg';
import receitaEmbalagensImg from '@/assets/tutorial/receita-embalagens.jpg';
import receitaProjecaoImg from '@/assets/tutorial/receita-projecao.jpg';
import receitaPrecificacaoImg from '@/assets/tutorial/receita-precificacao.jpg';
import custosImg from '@/assets/tutorial/custos-preview.jpg';
import custosFolhaImg from '@/assets/tutorial/custos-folha.jpg';
import custosEncargosImg from '@/assets/tutorial/custos-encargos.jpg';
import precificacaoImg from '@/assets/tutorial/precificacao-preview.jpg';
import precificacaoMarkupsImg from '@/assets/tutorial/precificacao-markups.jpg';

export interface SubScreen {
  title: string;
  image: string;
  description: string;
  bullets: string[];
  tips?: string[];
}

export interface TutorialSection {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  gradientBg: string;
  mainImage: string;
  intro: string;
  subScreens: SubScreen[];
}

export const sections: TutorialSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Sua visão geral do negócio',
    icon: Home,
    gradient: 'from-[hsl(205,96%,46%)] to-[hsl(228,63%,48%)]',
    gradientBg: 'from-[hsl(205,96%,46%,0.08)] to-[hsl(228,63%,48%,0.04)]',
    mainImage: dashboardImg,
    intro: 'O Dashboard é a primeira tela que você vê ao entrar no CalculaAi. Ele funciona como o painel de controle do seu negócio — mostra em tempo real o valor total do seu estoque, quanto entrou e saiu no mês, um gráfico detalhado dia a dia e o cálculo automático do CMV (Custo de Mercadoria Vendida).',
    subScreens: [
      {
        title: 'Cards de Resumo (Topo)',
        image: dashboardImg,
        description: 'No topo da tela, três cards apresentam os números mais importantes do mês corrente:',
        bullets: [
          '**Valor em Estoque**: Mostra o valor total de todos os seus produtos cadastrados multiplicados pelo custo unitário. Atualiza automaticamente quando você faz movimentações.',
          '**Entradas (Mês Atual)**: Soma de todas as entradas de estoque do mês — compras de fornecedor, devoluções de clientes, ajustes de inventário, etc.',
          '**Saídas (Mês Atual)**: Soma de todas as saídas — vendas, consumo interno, perdas, vencimentos e devoluções a fornecedor.',
        ],
        tips: [
          'Os cards usam cores diferentes para facilitar a identificação: verde para entradas, rosa para saídas.',
          'Clique em "Filtros" no canto superior direito para filtrar por período específico.',
        ],
      },
      {
        title: 'Gráfico de Movimentações Diárias',
        image: dashboardImg,
        description: 'Logo abaixo dos cards, um gráfico de barras mostra as movimentações dia a dia:',
        bullets: [
          '**Barras verdes** representam as entradas de cada dia.',
          '**Barras roxas/rosa** representam as saídas de cada dia.',
          'Passe o mouse sobre qualquer barra para ver os valores exatos com detalhes.',
          'O gráfico mostra todos os dias do mês atual (1 a 31), facilitando identificar dias de maior ou menor movimento.',
        ],
        tips: [
          'Use o gráfico para identificar padrões: dias de maior compra, picos de venda, etc.',
        ],
      },
      {
        title: 'Saldo Inicial e CMV %',
        image: dashboardImg,
        description: 'Na parte inferior do Dashboard, dois cards adicionais trazem métricas financeiras essenciais:',
        bullets: [
          '**Saldo Inicial do Estoque (Mês)**: Mostra quanto valia seu estoque no primeiro dia do mês. Esse valor é "congelado" automaticamente pelo sistema no fechamento de cada mês.',
          '**CMV % (Custo de Mercadoria Vendida)**: Indica qual percentual do valor das suas saídas foi gasto com mercadoria. É calculado como: CMV% = (Saldo Inicial + Entradas - Saldo Final) / Faturamento × 100.',
        ],
        tips: [
          'Se aparecer "(estimado)" ao lado do saldo inicial, significa que o sistema calculou retroativamente — no próximo mês fechará automaticamente.',
          'Um CMV% saudável geralmente fica entre 25% e 35% para alimentação. Acima disso, revise seus custos ou preços de venda.',
          'Clique em "Atualizar" para forçar o recálculo dos dados do Dashboard.',
        ],
      },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    subtitle: 'Cadastro de produtos e insumos',
    icon: Package,
    gradient: 'from-[hsl(228,63%,48%)] to-[hsl(273,63%,42%)]',
    gradientBg: 'from-[hsl(228,63%,48%,0.08)] to-[hsl(273,63%,42%,0.04)]',
    mainImage: estoqueImg,
    intro: 'A tela de Estoque é onde você cadastra e gerencia todos os seus produtos e insumos. Cada produto possui foto, nome, código interno, custo unitário, estoque atual, estoque mínimo, categorias, marcas, códigos de barras e um sistema de conversão de unidades (Modo de Uso).',
    subScreens: [
      {
        title: 'Lista de Produtos',
        image: estoqueImg,
        description: 'A aba "Lista de Produtos" exibe todos os seus produtos em uma tabela organizada com as seguintes colunas:',
        bullets: [
          '**Código**: Número interno sequencial gerado automaticamente pelo sistema.',
          '**Nome**: Nome do produto (ex: FARINHA DE TRIGO 1KG).',
          '**Marcas**: Marca(s) associada(s) ao produto (ex: HIPERPACK, NESTLÉ). Você cria marcas personalizadas.',
          '**Categorias**: Categoria(s) do produto (ex: EMBALAGEM, MATÉRIA-PRIMA). Também personalizáveis.',
          '**Unidade**: Unidade de compra (UN, KG, LT, PCT, etc.).',
          '**Estoque Atual**: Quantidade disponível no momento.',
          '**Custo Unit.**: Custo unitário do produto em R$.',
          '**Valor em Estoque**: Estoque Atual × Custo Unitário.',
          '**Ações**: Botões de editar (lápis) e excluir (lixeira).',
        ],
        tips: [
          'Use a barra de busca para encontrar produtos por nome, código interno ou código de barras.',
          'Filtre por marca, categoria ou status usando os seletores acima da tabela.',
          'Marque "Abaixo do mínimo" para ver apenas produtos que precisam de reposição.',
          'Use "Exportar Excel" para baixar uma planilha com todos os seus produtos.',
          'Use "Importar Excel" para cadastrar vários produtos de uma vez via planilha.',
        ],
      },
      {
        title: 'Criar / Editar Produto — Aba "Estoque & Custos"',
        image: estoqueCriarImg,
        description: 'Ao clicar em "+ Criar Produto" ou no lápis de edição, abre um modal com 3 abas. Na primeira aba "Estoque & Custos", você preenche:',
        bullets: [
          '**Foto do Produto**: Clique na área pontilhada para fazer upload de uma imagem. Ela aparece na lista e nas receitas.',
          '**Nome do Produto** (obrigatório): Nome descritivo do insumo (ex: "Farinha de Trigo 1kg").',
          '**Código Interno** (obrigatório): Gerado automaticamente, mas pode ser alterado.',
          '**Marcas**: Selecione uma ou mais marcas. Clique no ícone de configuração para criar novas marcas.',
          '**Categorias**: Selecione uma ou mais categorias. Clique no ícone de configuração para criar novas categorias.',
          '**Códigos de Barras**: Digite o código e pressione Enter para adicionar. Aceita múltiplos códigos (útil para o mesmo produto com embalagens diferentes).',
          '**Unidade de Compra** (obrigatório): Como você compra esse produto (Unidade, Kg, Litro, Pacote, Caixa, etc.).',
          '**Custo Unitário** (obrigatório): Quanto custa uma unidade de compra em R$.',
          '**Valor Total em Estoque**: Calculado automaticamente (Estoque Atual × Custo Unitário).',
          '**Estoque Atual** (obrigatório): Quantidade que você tem agora.',
          '**Estoque Mínimo**: Quantidade mínima desejada. Quando o estoque ficar abaixo, o sistema emite um alerta.',
        ],
        tips: [
          'Sempre defina um estoque mínimo para receber alertas antes de ficar sem insumo.',
          'O custo unitário é o valor que você PAGOU, não o de venda.',
        ],
      },
      {
        title: 'Criar / Editar Produto — Aba "Modo de Uso"',
        image: estoqueModoUsoImg,
        description: 'A aba "Modo de Uso" permite configurar uma unidade de uso diferente da unidade de compra, com conversão automática:',
        bullets: [
          '**Unidade de Uso**: Defina como esse produto será usado nas receitas (ex: gramas, mililitros, centímetros).',
          '**Fator de Conversão**: Quantas unidades de uso equivalem a 1 unidade de compra. Exemplo: 1 kg = 1000 g, então fator = 1000.',
          '**Custo por Unidade de Uso**: Calculado automaticamente. Se 1 kg custa R$10,00 e fator = 1000, cada grama custa R$0,01.',
        ],
        tips: [
          'Essencial para ingredientes como farinha (compra em kg, usa em g), leite (compra em litro, usa em ml), fita (compra em rolo, usa em cm).',
          'Nas receitas, o sistema usa automaticamente a unidade de uso e calcula o custo proporcional.',
          'Se você não configurar o Modo de Uso, o produto será usado na receita com a unidade de compra.',
        ],
      },
      {
        title: 'Histórico Geral',
        image: estoqueImg,
        description: 'A segunda aba principal ("Histórico Geral") mostra TODAS as movimentações de TODOS os produtos, em ordem cronológica:',
        bullets: [
          'Data e hora de cada movimentação.',
          'Nome do produto movimentado.',
          'Tipo (Entrada ou Saída) com badge colorido.',
          'Motivo da movimentação (Compra, Venda, Perda, etc.).',
          'Quantidade movimentada e custo unitário aplicado.',
          'Valor total (subtotal) da movimentação.',
        ],
        tips: [
          'Use o Histórico Geral para auditar movimentações e verificar quem fez o quê.',
          'Cada produto individual também tem seu próprio histórico na aba "Histórico" do modal de edição.',
        ],
      },
    ],
  },
  {
    id: 'movimentacao',
    title: 'Movimentação',
    subtitle: 'Entradas e saídas do estoque',
    icon: TrendingUp,
    gradient: 'from-[hsl(273,63%,42%)] to-[hsl(315,82%,38%)]',
    gradientBg: 'from-[hsl(273,63%,42%,0.08)] to-[hsl(315,82%,38%,0.04)]',
    mainImage: movimentacaoImg,
    intro: 'A tela de Movimentação é o coração operacional do CalculaAi. Aqui você registra todas as entradas e saídas de estoque usando um sistema intuitivo de carrinho de compras — selecione vários produtos, configure cada um individualmente e confirme todos de uma vez.',
    subScreens: [
      {
        title: 'Tela Principal — Catálogo de Produtos',
        image: movimentacaoImg,
        description: 'A tela é dividida em duas partes: à esquerda o catálogo de produtos, à direita o carrinho.',
        bullets: [
          '**Barra de Busca**: Busque por nome, código interno ou código de barras. Funciona em tempo real.',
          '**Filtro por Categorias**: Uma faixa horizontal com todas as categorias (Todos, Confeitos, Decoração, Embalagem, Frutas, etc.). Cada categoria mostra a quantidade de produtos. Clique para filtrar.',
          '**Cards de Produtos**: Cada produto aparece como um card com foto (ou inicial), nome e custo unitário. Clique no card para abrir o modal de movimentação.',
          '**Carrinho (lado direito)**: Mostra os itens já adicionados. Tem campos de Responsável e Observação. O botão "Finalizar e Gerar Comprovante" confirma tudo de uma vez.',
        ],
        tips: [
          'A categoria "Todos" mostra o número total de produtos cadastrados.',
          'Use o código de barras para buscas rápidas se tiver um leitor.',
        ],
      },
      {
        title: 'Modal de Movimentação do Produto',
        image: movimentacaoModalImg,
        description: 'Ao clicar em um produto, abre o modal de configuração da movimentação com os seguintes campos:',
        bullets: [
          '**Foto e nome do produto** no topo, com o código interno.',
          '**Tipo de Movimentação**: Escolha entre "Entrada" (ícone verde ⊕) ou "Saída" (ícone vermelho ⊖).',
          '**Motivo**: Selecione o motivo da movimentação. Para ENTRADAS: Compra de fornecedor, Devolução de cliente, Ajuste de inventário, Transferência, Produção interna, Doação recebida. Para SAÍDAS: Venda, Consumo interno, Perda/quebra, Vencimento, Devolução a fornecedor, Ajuste, Doação, Transferência.',
          '**Quantidade**: Informe quantas unidades está movimentando.',
          '**Custo Unitário**: Preenchido automaticamente com o custo cadastrado. Pode ser alterado (ex: compra com desconto).',
          '**Subtotal**: Calculado automaticamente (Quantidade × Custo Unitário).',
          '**Botão "Adicionar ao Carrinho"**: Adiciona o item ao carrinho. Você pode continuar adicionando outros produtos.',
        ],
        tips: [
          'Se o custo do fornecedor mudou, altere o Custo Unitário antes de adicionar. O sistema pode atualizar o custo do produto automaticamente.',
          'Confira todos os itens no carrinho antes de finalizar — a movimentação NÃO pode ser desfeita.',
          'O campo "Responsável" é obrigatório para finalizar. Selecione quem está fazendo a movimentação.',
          'Use "Observação" para anotar detalhes como número da nota fiscal, nome do fornecedor, etc.',
        ],
      },
    ],
  },
  {
    id: 'receitas',
    title: 'Receitas',
    subtitle: 'Monte, calcule e precifique',
    icon: ChefHat,
    gradient: 'from-[hsl(315,82%,38%)] to-[hsl(340,91%,45%)]',
    gradientBg: 'from-[hsl(315,82%,38%,0.08)] to-[hsl(340,91%,45%,0.04)]',
    mainImage: receitasImg,
    intro: 'A tela de Receitas é onde você monta seus produtos finais. Cada receita tem 6 abas completas: Geral, Ingredientes, Sub-receitas, Embalagens, Projeção e Precificação. O custo é calculado automaticamente a partir dos ingredientes do estoque, e o preço de venda sugerido vem do Markup vinculado.',
    subScreens: [
      {
        title: 'Lista de Receitas',
        image: receitasImg,
        description: 'A tela principal mostra todas as receitas cadastradas em cards detalhados:',
        bullets: [
          '**Número sequencial** em um círculo azul (identificação única da receita).',
          '**Nome da receita** e informações de sub-receitas e rendimento.',
          '**Indicadores**: Tempo Total, Tempo M.O. (mão de obra), nº de Ingredientes, nº de Sub-receitas, nº de Embalagens.',
          '**Custos detalhados**: Custo de M.O., Custo de Matéria-Prima, Custo de Embalagem e **Custo Total** (destacado em azul).',
          '**Preço de Venda**, **Lucro Bruto** e **Lucro Líquido** (calculados automaticamente se houver markup vinculado).',
          '**Ações**: Download PDF, Visualizar, Editar, Duplicar e Excluir.',
        ],
        tips: [
          'Use a busca e os filtros por tipo de produto e status para encontrar receitas rapidamente.',
          '"Exportar Excel" gera uma planilha com todas as receitas e seus custos.',
          'O botão de duplicar (ícone de cópia) cria uma cópia completa da receita — ótimo para variações.',
        ],
      },
      {
        title: 'Aba 1 — Geral',
        image: receitaGeralImg,
        description: 'A primeira aba contém os dados básicos da receita:',
        bullets: [
          '**Imagem da Receita**: Upload de uma foto do produto finalizado. Aparece na lista e no PDF exportado.',
          '**Conservação**: Configure temperaturas e tempos para Congelado, Refrigerado e Ambiente. Exemplo: Congelado a -18°C por 90 dias.',
          '**Nome da Receita** (obrigatório): Nome descritivo do produto (ex: "Bolo de Chocolate 1kg").',
          '**Passos de Preparo**: Adicione instruções sequenciais de como produzir a receita. Cada passo pode ter uma imagem ilustrativa.',
        ],
        tips: [
          'Preencha a conservação para que apareça nos rótulos e PDFs exportados.',
          'Os passos de preparo são opcionais, mas muito úteis para padronizar a produção da equipe.',
        ],
      },
      {
        title: 'Aba 2 — Ingredientes',
        image: receitaIngredientesImg,
        description: 'Aqui você adiciona os insumos do estoque que compõem a receita:',
        bullets: [
          '**Busca de ingredientes**: Pesquise pelo nome ou código do produto cadastrado no estoque.',
          '**Lista de disponíveis**: Mostra os produtos encontrados com custo unitário e botão "+ Adicionar".',
          '**Tabela de ingredientes adicionados**: Mostra Ingrediente, Quantidade, Unidade (usa a unidade de uso se configurada), Custo Unitário e Custo Total.',
          '**Custo Total dos Ingredientes**: Calculado automaticamente. Aparece no rodapé da tabela.',
          '**A quantidade é editável**: Altere diretamente na tabela. O custo recalcula instantaneamente.',
        ],
        tips: [
          'Se o produto tem "Modo de Uso" configurado (ex: kg→g), a unidade e o custo aparecem convertidos automaticamente.',
          'O custo dos ingredientes é um dos componentes do Custo Total da receita.',
          'Se o custo de um produto no estoque mudar, o custo da receita recalcula automaticamente.',
        ],
      },
      {
        title: 'Aba 3 — Sub-receitas',
        image: receitaSubReceitasImg,
        description: 'Sub-receitas são outras receitas que servem de base para esta. Exemplo: a receita "Bolo Confeitado" pode usar a sub-receita "Massa Base" e a sub-receita "Cobertura de Chocolate":',
        bullets: [
          '**Aviso de disponibilidade**: O sistema mostra quantas sub-receitas estão disponíveis (ex: "107 Sub-receitas Disponíveis").',
          '**Busca e filtro**: Pesquise sub-receitas pelo nome.',
          '**Lista com badge "Sub"**: Cada sub-receita disponível mostra nome, custo e botão "+ Adicionar".',
          '**Tabela de sub-receitas vinculadas**: Mostra nome, unidade, quantidade, custo unitário e custo total.',
          '**Total de Sub-receitas**: Badge azul com o custo total de todas as sub-receitas usadas.',
        ],
        tips: [
          'Para uma receita aparecer como sub-receita disponível, ela precisa ter o markup "Sub-receitas" vinculado na aba Precificação.',
          'Sub-receitas são ideais para bases, massas, caldas e recheios que você reutiliza em vários produtos.',
          'O custo da sub-receita é calculado com base nos ingredientes dela — se mudar, propaga para todas as receitas que a usam.',
        ],
      },
      {
        title: 'Aba 4 — Embalagens',
        image: receitaEmbalagensImg,
        description: 'Adicione as embalagens e recipientes que acompanham o produto final:',
        bullets: [
          '**Funciona igual à aba de Ingredientes**: Busque produtos do estoque, adicione e defina a quantidade.',
          '**Tabela de embalagens**: Mostra Embalagem, Quantidade, Unidade, Custo Unitário e Custo Total.',
          '**Exemplos**: Base laminada para doce (1 pct = R$0,62), Acetato 7cm (18 cm = R$0,30), forminhas, caixas, sacos, etc.',
          '**Custo de embalagem entra no Custo Total**: A embalagem é tão importante quanto os ingredientes para o cálculo do preço final.',
        ],
        tips: [
          'Cadastre todas as embalagens como produtos no Estoque — assim o sistema controla o estoque delas também.',
          'Se a embalagem tem modo de uso (ex: rolo de 100m, usa em cm), a conversão funciona automaticamente aqui.',
        ],
      },
      {
        title: 'Aba 5 — Projeção',
        image: receitaProjecaoImg,
        description: 'A aba de Projeção combina dados do produto com tempos e mão de obra:',
        bullets: [
          '**Tipo de Produto** (obrigatório): Classifique a receita (ex: Doce, Salgado, Bolo, Sobremesa). Crie tipos personalizados clicando no "+".',
          '**Rendimento** (obrigatório): Defina quantas unidades essa receita produz (ex: 10 brigadeiros, 1 bolo). Selecione a unidade (Unidade, Grama, Kg, etc.).',
          '**Tempo de Preparo Total**: Quanto tempo leva do início ao fim (incluindo forno, descanso, etc.).',
          '**Tempo de Mão de Obra Direta**: Tempo efetivo que alguém está trabalhando na receita. Aqui você pode vincular funcionários cadastrados na Folha de Pagamento para calcular o custo da mão de obra automaticamente.',
        ],
        tips: [
          'O rendimento é fundamental para calcular o custo por unidade: Custo Total da Receita ÷ Rendimento = Custo por Unidade.',
          'Vincular mão de obra permite calcular quanto cada hora de trabalho custa na receita.',
        ],
      },
      {
        title: 'Aba 6 — Precificação',
        image: receitaPrecificacaoImg,
        description: 'A última aba mostra o resumo financeiro completo da receita e permite vincular markups:',
        bullets: [
          '**Resumo de Custos**: Lista detalhada com custo de Ingredientes, Embalagens, Mão de Obra e Sub-receitas. O **Total** é o custo completo para produzir a receita inteira.',
          '**Preço de Venda (R$/un.)**: Custo Total ÷ Rendimento × Markup. É o preço sugerido por unidade.',
          '**Peso Unitário (g)**: Se preenchido, calcula o preço por kg automaticamente.',
          '**Preço por KG**: Calculado automaticamente para comparação de mercado.',
          '**Markups Configurados**: Selecione qual(is) markup(s) vincular a esta receita. Cada markup gera um preço de venda diferente.',
          '**Markup de Sub-receitas**: Se selecionado, esta receita fica disponível para ser usada como sub-receita em outras receitas.',
        ],
        tips: [
          'Você pode vincular mais de um markup para comparar preços entre canais (loja, delivery, atacado).',
          'O Lucro Bruto = Preço de Venda - Custo Total. O Lucro Líquido desconta também os encargos sobre venda.',
          'Se o markup "Sub-receitas" estiver selecionado, aparece um aviso verde explicando que a receita ficará disponível na aba Sub-receitas de outras receitas.',
        ],
      },
    ],
  },
  {
    id: 'custos',
    title: 'Custos',
    subtitle: 'Despesas, folha e encargos',
    icon: DollarSign,
    gradient: 'from-[hsl(340,91%,45%)] to-[hsl(25,95%,51%)]',
    gradientBg: 'from-[hsl(340,91%,45%,0.08)] to-[hsl(25,95%,51%,0.04)]',
    mainImage: custosImg,
    intro: 'A tela de Custos é onde você cadastra todos os gastos fixos do seu negócio, divididos em 3 abas: Despesas Fixas (aluguel, energia, internet), Folha de Pagamento (funcionários com todos os encargos trabalhistas) e Encargos sobre Venda (impostos, taxas, comissões). Esses valores alimentam o cálculo do Markup na tela de Precificação.',
    subScreens: [
      {
        title: 'Aba 1 — Despesas Fixas',
        image: custosImg,
        description: 'Cadastre todas as despesas fixas mensais do seu negócio:',
        bullets: [
          '**Painel de Categorias (lado esquerdo)**: Organize despesas em categorias personalizadas (ex: "Despesas Administrativas", "Investimento"). Mostra o total de cada categoria e o Total Geral.',
          '**Botão "+ Adicionar"**: Crie novas categorias de despesas.',
          '**Lista de Despesas (lado direito)**: Tabela com Nome, Valor (R$) e botões de editar/excluir.',
          '**Cada despesa tem**: Nome (ex: "ALUGUEL"), descrição opcional (ex: "ALUGUEL LOJA + ALUGUEL IMPRESSORA"), valor mensal (R$), dia de vencimento e categoria.',
          '**"Sem Categoria"**: Despesas que ainda não foram classificadas aparecem agrupadas aqui.',
          '**Total Geral**: Soma de todas as despesas fixas, exibido no topo do painel de categorias (ex: R$ 35.276,54).',
        ],
        tips: [
          'O Total Geral das despesas fixas é usado no cálculo do Markup como "Gasto sobre Faturamento".',
          'Crie categorias para organizar: Utilidades, Infraestrutura, Marketing, Investimentos, etc.',
          'Revise mensalmente os valores — despesas como energia e água podem variar.',
        ],
      },
      {
        title: 'Aba 2 — Folha de Pagamento',
        image: custosFolhaImg,
        description: 'Cadastre todos os funcionários com custos detalhados:',
        bullets: [
          '**Total da Folha**: Mostra o custo total mensal de todos os funcionários (ex: R$ 27.441,71).',
          '**Tabela de Funcionários**: Nome, Cargo, Tipo de Mão de Obra (Direta ou Indireta), Valor da Mão de Obra (custo/hora) e Valor Total do Funcionário.',
          '**Ao criar/editar um funcionário, configure**: Nome, cargo, salário base, tipo de mão de obra (direta = quem produz, indireta = administrativo), horas por dia, dias por semana.',
          '**Encargos trabalhistas individuais**: INSS (%), FGTS (%), Férias (%), RAT (%), Vale-Transporte, Vale-Refeição, Vale-Alimentação, Plano de Saúde e Outros.',
          '**Custo por hora calculado automaticamente**: Salário Total (base + encargos) ÷ Horas mensais.',
          '**Botão de duplicar**: Copie um funcionário para criar outro com configurações similares.',
        ],
        tips: [
          'O "Custo por hora" (coluna "Valor da Mão de Obra") é o valor usado quando você vincula esse funcionário à mão de obra de uma receita.',
          'Funcionários de mão de obra "Direta" afetam o custo dos produtos. "Indireta" entra como despesa fixa no markup.',
          'Mantenha os encargos atualizados conforme a legislação trabalhista.',
        ],
      },
      {
        title: 'Aba 3 — Encargos sobre Venda',
        image: custosEncargosImg,
        description: 'Configure todos os encargos que incidem sobre cada venda realizada. A tela é dividida em 4 seções:',
        bullets: [
          '**Impostos**: ICMS (%), IPI (%), IRPJ/CSLL (%), ISS (%), PIS/COFINS (%). Cada um com campo de percentual e valor fixo. Preencha conforme seu regime tributário.',
          '**Comissões e Plataformas**: Aplicativo de delivery (%), Colaboradores/comissão (%), Marketing (%), Plataforma SaaS (%). Para quem vende online ou paga comissões.',
          '**Taxas de Meios de Pagamento**: Taxas de cartão de crédito, débito, PIX, etc. Cada uma com percentual e/ou valor fixo.',
          '**Outros**: Seção livre para adicionar qualquer outro encargo (ex: frete médio, embalagem delivery). Botão "+ Adicionar" para criar novos.',
        ],
        tips: [
          'Esses encargos são somados e aparecem como "Encargos sobre Venda (%)" no cálculo do Markup.',
          'Se você é MEI, geralmente não tem ICMS, ISS, etc. Confirme com seu contador.',
          'Taxas de delivery (iFood, Rappi) geralmente variam entre 12% e 27%. Coloque a média.',
          'Os valores são percentuais sobre o preço de venda, não sobre o custo.',
        ],
      },
    ],
  },
  {
    id: 'precificacao',
    title: 'Precificação',
    subtitle: 'Defina seus preços com inteligência',
    icon: Calculator,
    gradient: 'from-[hsl(25,95%,51%)] to-[hsl(205,96%,46%)]',
    gradientBg: 'from-[hsl(25,95%,51%,0.08)] to-[hsl(205,96%,46%,0.04)]',
    mainImage: precificacaoImg,
    intro: 'A Precificação é o coração financeiro do CalculaAi. Aqui você cria Markups — fórmulas que consideram suas despesas fixas, encargos sobre venda e margem de lucro desejada para calcular o multiplicador ideal. Quando vinculado a uma receita, o Markup gera automaticamente o preço de venda sugerido.',
    subScreens: [
      {
        title: 'Aba 1 — Média de Faturamento',
        image: precificacaoImg,
        description: 'Antes de criar markups, informe seu faturamento mensal. Ele é a base para calcular quanto cada despesa fixa representa em percentual:',
        bullets: [
          '**Lançar Faturamento**: Preencha o valor do faturamento, selecione o mês e ano, e clique em "+ Adicionar".',
          '**Média Mensal**: Card azul mostrando a média de faturamento calculada. Exemplo: R$ 115.000,00.',
          '**Total do Período**: Card verde com o total acumulado.',
          '**Evolução — Últimos 6 Meses**: Gráfico de pontos mostrando a evolução do faturamento mês a mês.',
          '**Faturamentos Lançados**: Tabela com todos os faturamentos já informados, com opção de editar e excluir.',
        ],
        tips: [
          'A Média de Faturamento é FUNDAMENTAL para o cálculo do markup. Sem ela, o sistema não consegue calcular o percentual das despesas fixas.',
          'Lance pelo menos 3 meses de faturamento para uma média mais confiável.',
          'Se seu faturamento varia muito, considere criar markups com períodos diferentes (últimos 3, 6 ou 12 meses).',
        ],
      },
      {
        title: 'Aba 2 — Configuração de Markups',
        image: precificacaoMarkupsImg,
        description: 'O Markup é o multiplicador que transforma custo em preço de venda. Entenda como funciona:',
        bullets: [
          '**O que é um Markup?** É um número (ex: 2,5) que multiplicado pelo custo da receita gera o preço de venda. Se o custo é R$10 e o markup é 2,5, o preço sugerido é R$25.',
          '**Fórmula**: Markup = 100 ÷ (100 - Despesas% - Impostos% - Taxas% - Comissões% - Outros% - Margem de Lucro%). Quanto mais despesas e margem, maior o markup.',
          '**Botão "+ Novo Bloco de Markup"**: Cria um novo markup. Cada um pode ter configurações diferentes.',
          '**Período**: Selecione "Últimos 12 meses", "Últimos 6 meses" ou "Últimos 3 meses" para a média de faturamento.',
          '**Gasto sobre faturamento (%)**: Calculado automaticamente — quanto suas despesas fixas representam do faturamento médio.',
          '**Impostos (%)**: Vem automaticamente dos encargos de venda cadastrados.',
          '**Taxas de meios de pagamento (%)**: Também vem dos encargos de venda.',
          '**Comissões e plataformas (%)**: Idem.',
          '**Outros (%)**: Encargos extras.',
          '**Valor em real (R$)**: Valor fixo adicional por unidade vendida.',
          '**Lucro desejado sobre venda (%)**: Sua margem de lucro desejada. Ex: 7%.',
          '**Markup Ideal**: O número final calculado. Exemplo: se todas as despesas somam 59% e a margem é 7%, o markup ideal é 100 ÷ (100-59-7) = 2,94.',
          '**Botão "Configurar"**: Permite selecionar QUAIS despesas fixas e funcionários entram neste markup específico.',
        ],
        tips: [
          'Crie markups diferentes para cada canal de venda: "Loja Física" (sem taxa de delivery), "iFood" (com 27% de comissão), "Atacado" (margem menor, volume maior).',
          'O markup "Subreceita" é especial — ele marca a receita como disponível para ser usada dentro de outras receitas.',
          'Quando uma despesa fixa muda, TODOS os markups que a incluem recalculam automaticamente.',
          'Vincule o markup à receita na aba "Precificação" da receita para ver o preço sugerido.',
        ],
      },
    ],
  },
];
