import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Package,
  TrendingUp,
  ChefHat,
  DollarSign,
  Calculator,
  Building2,
  Crown,
  ChevronRight,
  ChevronDown,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Filter,
  Search,
  Camera,
  Layers,
  Settings,
  ClipboardList,
  ShoppingCart,
  Utensils,
  Warehouse,
  BookOpen,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface TutorialSection {
  id: string;
  title: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
  steps: TutorialStep[];
}

interface TutorialStep {
  title: string;
  content: string;
  tips?: string[];
  subSteps?: { title: string; content: string }[];
}

// -------------------------------------------------------
// Tutorial Data
// -------------------------------------------------------

const tutorialSections: TutorialSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Home,
    gradient: 'from-[hsl(205,96%,46%)] to-[hsl(228,63%,48%)]',
    description: 'Sua visão geral do negócio em tempo real.',
    steps: [
      {
        title: 'Visão Geral',
        content: 'O Dashboard é a primeira tela que você vê ao entrar no sistema. Ele mostra um resumo completo do seu negócio: valor em estoque, entradas e saídas do mês, e o gráfico de movimentações diárias.',
      },
      {
        title: 'Cards Principais',
        content: 'Na parte superior, você encontra três cards com informações essenciais:',
        subSteps: [
          { title: 'Valor em Estoque', content: 'Mostra o valor total dos produtos que você tem em estoque neste momento (quantidade × custo unitário de cada produto ativo).' },
          { title: 'Entradas do Mês', content: 'Soma de todas as entradas de produtos feitas no mês atual, em valor (R$).' },
          { title: 'Saídas do Mês', content: 'Soma de todas as saídas de produtos no mês, em valor (R$).' },
        ],
      },
      {
        title: 'Gráfico de Movimentações Diárias',
        content: 'Logo abaixo dos cards, o gráfico de barras mostra dia a dia as entradas (em azul) e saídas (em rosa) do mês. Passe o mouse sobre as barras para ver os valores exatos.',
      },
      {
        title: 'Saldo Inicial e CMV %',
        content: 'Abaixo do gráfico, dois cards mostram o Saldo Inicial do Estoque (valor do estoque no começo do mês) e o CMV % (Custo de Mercadoria Vendida em relação às saídas). O CMV ajuda a entender quanto do seu faturamento foi gasto com mercadoria.',
        tips: [
          'Se aparecer "(estimado)", significa que o sistema calculou o valor retroativamente porque é seu primeiro mês.',
          'O fechamento automático acontece no dia 1 de cada mês à meia-noite (horário de Brasília).',
        ],
      },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    icon: Package,
    gradient: 'from-[hsl(228,63%,48%)] to-[hsl(273,63%,42%)]',
    description: 'Cadastre e gerencie todos os seus produtos e insumos.',
    steps: [
      {
        title: 'Lista de Produtos',
        content: 'A aba principal do Estoque mostra todos os seus produtos cadastrados. Você pode buscar por nome, filtrar por categoria ou marca, e ordenar a lista.',
        tips: [
          'Use a barra de busca no topo para encontrar produtos rapidamente.',
          'Clique no ícone de filtro para filtrar por categorias ou marcas.',
        ],
      },
      {
        title: 'Criar Novo Produto',
        content: 'Clique no botão "+ Novo Produto" para abrir o formulário de cadastro. Ao abrir, você verá duas abas:',
        subSteps: [
          { title: 'Aba "Dados Gerais"', content: 'Aqui você preenche o nome do produto, unidade de compra (kg, un, L, etc.), custo unitário, estoque atual e estoque mínimo. Também pode adicionar uma foto, códigos de barras, categorias e marcas.' },
          { title: 'Aba "Modo de Uso"', content: 'Se o seu produto é comprado em uma unidade (ex: kg) mas usado em outra (ex: gramas), configure aqui a unidade de uso e o fator de conversão. Exemplo: compra em kg (1 kg = 1000g), usa em gramas.' },
        ],
      },
      {
        title: 'Editar Produto',
        content: 'Clique sobre qualquer produto na lista para abrir o mesmo formulário de criação, já preenchido com os dados atuais. Altere o que precisar e salve.',
      },
      {
        title: 'Foto do Produto',
        content: 'No formulário, clique na área de foto (ícone de câmera) para enviar uma imagem do produto. A imagem aparecerá na lista e em outros lugares do sistema.',
      },
      {
        title: 'Categorias e Marcas',
        content: 'Ao criar ou editar um produto, você pode selecionar categorias e marcas existentes ou criar novas. Isso facilita a organização e os filtros.',
      },
      {
        title: 'Histórico Geral',
        content: 'A segunda aba da página de Estoque mostra o histórico completo de todas as movimentações (entradas e saídas) de todos os produtos, com data, hora, tipo e motivo.',
      },
    ],
  },
  {
    id: 'movimentacao',
    title: 'Movimentação',
    icon: TrendingUp,
    gradient: 'from-[hsl(273,63%,42%)] to-[hsl(315,82%,38%)]',
    description: 'Registre entradas e saídas de produtos do estoque.',
    steps: [
      {
        title: 'Como Funciona',
        content: 'A tela de Movimentação funciona como um "carrinho de compras". Você seleciona os produtos, define tipo (entrada ou saída), quantidade e motivo, e depois confirma tudo de uma vez.',
      },
      {
        title: 'Selecionar Produto',
        content: 'Na lista de produtos, clique sobre o produto que deseja movimentar. Isso abrirá uma janela para configurar a movimentação.',
        tips: [
          'Use a barra de busca para encontrar o produto.',
          'Filtre por categorias usando os botões acima da lista.',
        ],
      },
      {
        title: 'Configurar a Movimentação',
        content: 'Na janela que abre ao clicar no produto, configure:',
        subSteps: [
          { title: 'Tipo', content: 'Escolha entre Entrada (produto entrando no estoque) ou Saída (produto saindo do estoque).' },
          { title: 'Motivo', content: 'Selecione o motivo: para entradas, pode ser "Compra de fornecedor", "Devolução de cliente", etc. Para saídas: "Venda", "Consumo interno", "Perda/Quebra", etc.' },
          { title: 'Quantidade', content: 'Informe a quantidade. O sistema mostra o estoque atual do produto.' },
          { title: 'Custo Aplicado', content: 'O custo vem preenchido automaticamente com o custo unitário do produto, mas você pode alterar se necessário.' },
        ],
      },
      {
        title: 'Carrinho de Movimentação',
        content: 'Após configurar, clique em "Adicionar ao Carrinho". O item aparece na barra lateral do carrinho. Você pode adicionar vários produtos antes de confirmar.',
        tips: [
          'Confira todos os itens no carrinho antes de confirmar.',
          'É possível remover itens do carrinho antes de finalizar.',
          'Ao confirmar, o estoque de todos os produtos é atualizado de uma vez.',
        ],
      },
    ],
  },
  {
    id: 'receitas',
    title: 'Receitas',
    icon: ChefHat,
    gradient: 'from-[hsl(315,82%,38%)] to-[hsl(340,91%,45%)]',
    description: 'Monte receitas, calcule custos e precifique seus produtos.',
    steps: [
      {
        title: 'Lista de Receitas',
        content: 'A tela principal mostra todas as suas receitas cadastradas em cards. Cada card exibe o nome da receita, o custo total e o preço de venda.',
      },
      {
        title: 'Criar Nova Receita',
        content: 'Clique em "+ Nova Receita" para abrir o formulário completo. A receita é organizada em abas:',
        subSteps: [
          { title: 'Aba "Geral"', content: 'Preencha o nome da receita, o rendimento (ex: 10 unidades ou 2 kg), tempo de preparo, tipo de produto, e observações. Você também pode adicionar uma foto.' },
          { title: 'Aba "Ingredientes"', content: 'Adicione os ingredientes (produtos do estoque) e suas quantidades. O custo é calculado automaticamente com base no custo unitário de cada produto.' },
          { title: 'Aba "Sub-receitas"', content: 'Se a receita usa outra receita como base (ex: uma massa que vai dentro de um bolo), adicione aqui. O custo da sub-receita é somado automaticamente.' },
          { title: 'Aba "Embalagens"', content: 'Adicione embalagens e recipientes (também produtos do estoque) que fazem parte do custo final do produto.' },
          { title: 'Aba "Precificação"', content: 'Aqui você vincula um Markup à receita. O sistema calcula o preço de venda sugerido com base no custo total e no markup escolhido.' },
          { title: 'Aba "Projeção"', content: 'Simule cenários de produção: quantas unidades produzir, quanto de ingrediente vai precisar e qual o faturamento esperado.' },
        ],
      },
      {
        title: 'Editar Receita',
        content: 'Clique no card de qualquer receita para abrir o formulário completo de edição com todas as abas.',
      },
      {
        title: 'Modo de Preparo',
        content: 'Na aba "Geral", você pode adicionar passos de preparo em sequência. Cada passo tem uma descrição e pode ter uma imagem ilustrativa.',
      },
      {
        title: 'Histórico Geral',
        content: 'A segunda aba da página mostra o histórico de alterações de todas as receitas.',
      },
    ],
  },
  {
    id: 'custos',
    title: 'Custos',
    icon: DollarSign,
    gradient: 'from-[hsl(340,91%,45%)] to-[hsl(25,95%,51%)]',
    description: 'Gerencie despesas fixas, folha de pagamento e encargos.',
    steps: [
      {
        title: 'Despesas Fixas',
        content: 'A primeira aba lista todas as suas despesas fixas mensais (aluguel, conta de luz, internet, etc.). Clique em "+ Nova Despesa" para cadastrar.',
        subSteps: [
          { title: 'Criar Despesa', content: 'Informe o nome, valor mensal, dia de vencimento e a categoria da despesa. Você pode criar categorias personalizadas.' },
          { title: 'Categorias', content: 'Clique no botão de categorias para criar e gerenciar categorias de despesas (ex: "Utilidades", "Infraestrutura").' },
        ],
        tips: [
          'Despesas fixas são usadas no cálculo do Markup e na precificação.',
          'O valor total das despesas fixas aparece resumido no topo.',
        ],
      },
      {
        title: 'Folha de Pagamento',
        content: 'A segunda aba permite cadastrar funcionários com seus salários, encargos trabalhistas e configurar o custo por hora.',
        subSteps: [
          { title: 'Cadastrar Funcionário', content: 'Informe nome, cargo, salário base, tipo de mão de obra (direta/indireta), horas de trabalho por dia e dias por semana.' },
          { title: 'Encargos Trabalhistas', content: 'Configure percentuais de INSS, FGTS, férias, RAT, vale-transporte, vale-refeição, etc. O sistema calcula automaticamente os valores e o custo por hora.' },
        ],
        tips: [
          'O custo por hora calculado pode ser usado nas receitas para calcular mão de obra.',
          'Funcionários inativos não entram nos cálculos.',
        ],
      },
      {
        title: 'Encargos sobre Venda',
        content: 'A terceira aba é para cadastrar encargos que incidem sobre cada venda: taxas de cartão, comissões, impostos sobre venda, etc.',
        subSteps: [
          { title: 'Criar Encargo', content: 'Informe nome, tipo (percentual ou fixo) e o valor. Exemplo: "Taxa de cartão 3.5%".' },
        ],
        tips: [
          'Encargos sobre venda são usados no cálculo do Markup.',
          'Você pode ter vários encargos ativos ao mesmo tempo.',
        ],
      },
    ],
  },
  {
    id: 'precificacao',
    title: 'Precificação',
    icon: Calculator,
    gradient: 'from-[hsl(25,95%,51%)] to-[hsl(205,96%,46%)]',
    description: 'Calcule markups e defina preços de venda ideais.',
    steps: [
      {
        title: 'Média de Faturamento',
        content: 'A primeira aba calcula sua média de faturamento com base nos dados cadastrados. Isso é usado para definir quanto cada despesa fixa representa sobre o faturamento.',
      },
      {
        title: 'Markups',
        content: 'A segunda aba é onde a mágica acontece! Aqui você cria e gerencia seus Markups:',
        subSteps: [
          { title: 'Criar Markup', content: 'Clique em "+ Novo Markup" e dê um nome. Selecione quais despesas fixas, folha de pagamento e encargos sobre venda devem ser considerados.' },
          { title: 'Configurar', content: 'Defina a margem de lucro desejada (%). O sistema calcula automaticamente o Markup Ideal e o preço sugerido.' },
          { title: 'Fórmula', content: 'Markup = 100 / (100 - Despesas% - Encargos% - Margem%). O preço sugerido = Custo × Markup.' },
        ],
        tips: [
          'Você pode ter vários markups diferentes (ex: um para delivery, outro para loja).',
          'Vincule markups às receitas na aba de Precificação da receita.',
          'O markup é recalculado automaticamente quando você altera despesas ou encargos.',
        ],
      },
    ],
  },
  {
    id: 'perfil',
    title: 'Perfil de Negócio',
    icon: Building2,
    gradient: 'from-[hsl(205,96%,46%)] to-[hsl(273,63%,42%)]',
    description: 'Configure as informações da sua empresa.',
    steps: [
      {
        title: 'Dados da Empresa',
        content: 'Preencha as informações da sua empresa: razão social, nome fantasia, CNPJ/CPF, tipo de negócio, setor de atividade, porte e regime tributário.',
      },
      {
        title: 'Endereço e Contato',
        content: 'Cadastre o endereço completo, telefones, email comercial, WhatsApp e Instagram.',
      },
      {
        title: 'Logo e Cores',
        content: 'Envie a logo da empresa e configure as cores primária e secundária para personalizar relatórios e exportações.',
      },
      {
        title: 'Responsável Legal',
        content: 'Cadastre os dados do responsável legal: nome, CPF, cargo, email e telefone.',
      },
    ],
  },
  {
    id: 'planos',
    title: 'Planos',
    icon: Crown,
    gradient: 'from-[hsl(315,82%,38%)] to-[hsl(25,95%,51%)]',
    description: 'Gerencie sua assinatura e veja os limites do seu plano.',
    steps: [
      {
        title: 'Plano Atual',
        content: 'Veja qual plano você está usando e quais são os limites de produtos, receitas e markups disponíveis.',
      },
      {
        title: 'Comparar Planos',
        content: 'Compare as funcionalidades dos planos Free, Profissional e Enterprise. Cada plano libera mais recursos.',
        subSteps: [
          { title: 'Free', content: 'Até 30 produtos, 5 receitas, 1 markup. Ideal para começar.' },
          { title: 'Profissional', content: 'Produtos ilimitados, até 60 receitas, 3 markups, movimentações e exportação PDF.' },
          { title: 'Enterprise', content: 'Tudo ilimitado. Para quem precisa do máximo.' },
        ],
      },
      {
        title: 'Fazer Upgrade',
        content: 'Clique no plano desejado para fazer upgrade. O pagamento é processado via Stripe de forma segura.',
      },
    ],
  },
];

// -------------------------------------------------------
// Components
// -------------------------------------------------------

function SectionCard({
  section,
  isExpanded,
  onToggle,
}: {
  section: TutorialSection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = section.icon;

  return (
    <Card className="glass-card overflow-hidden border-border/30 rounded-2xl transition-all duration-300 hover:shadow-lg">
      {/* Gradient top bar */}
      <div className={cn('h-1 bg-gradient-to-r', section.gradient)} />

      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-center gap-4 group"
      >
        <div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
            section.gradient
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold font-display text-foreground">
            {section.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {section.description}
          </p>
        </div>

        <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="px-5 pb-6 pt-0 space-y-5 animate-fade-in">
          <Separator className="bg-border/30" />

          {section.steps.map((step, idx) => (
            <StepBlock key={idx} step={step} index={idx + 1} gradient={section.gradient} />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

function StepBlock({
  step,
  index,
  gradient,
}: {
  step: TutorialStep;
  index: number;
  gradient: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'w-7 h-7 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5',
            gradient
          )}
        >
          {index}
        </span>
        <div className="space-y-2 flex-1">
          <h4 className="font-semibold text-foreground">{step.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.content}
          </p>

          {step.subSteps && (
            <div className="space-y-2 mt-3 pl-3 border-l-2 border-border/40">
              {step.subSteps.map((sub, i) => (
                <div key={i}>
                  <span className="text-sm font-medium text-foreground">
                    {sub.title}:
                  </span>{' '}
                  <span className="text-sm text-muted-foreground">
                    {sub.content}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step.tips && step.tips.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {step.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm bg-primary/5 rounded-lg px-3 py-2"
                >
                  <span className="text-primary font-bold mt-px">💡</span>
                  <span className="text-muted-foreground">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default function Tutorial() {
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard');

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(205,96%,46%)] to-[hsl(25,95%,51%)] mb-2">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
          Como usar o CalculaAi
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Um guia completo de cada tela e funcionalidade do sistema. Clique em uma seção para expandir e aprender.
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap justify-center gap-2">
        {tutorialSections.map((s) => {
          const Icon = s.icon;
          const isActive = expandedSection === s.id;
          return (
            <Button
              key={s.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSection(s.id)}
              className={cn(
                'rounded-full gap-1.5 text-xs',
                isActive && 'bg-gradient-to-r ' + s.gradient + ' border-0'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.title}
            </Button>
          );
        })}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {tutorialSections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            isExpanded={expandedSection === section.id}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </div>
    </div>
  );
}
