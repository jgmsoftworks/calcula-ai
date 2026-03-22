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
  ChevronDown,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  LucideIcon,
  MousePointerClick,
  BarChart3,
  ShoppingCart,
  Layers,
  Settings,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Images
import dashboardImg from '@/assets/tutorial/dashboard-preview.jpg';
import estoqueImg from '@/assets/tutorial/estoque-preview.jpg';
import movimentacaoImg from '@/assets/tutorial/movimentacao-preview.jpg';
import receitasImg from '@/assets/tutorial/receitas-preview.jpg';
import custosImg from '@/assets/tutorial/custos-preview.jpg';
import precificacaoImg from '@/assets/tutorial/precificacao-preview.jpg';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface TutorialSection {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  gradientBg: string;
  image: string;
  description: string;
  features: Feature[];
  details: Detail[];
}

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface Detail {
  title: string;
  content: string;
  tips?: string[];
}

// -------------------------------------------------------
// Data
// -------------------------------------------------------

const sections: TutorialSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Sua visão geral',
    icon: Home,
    gradient: 'from-[hsl(205,96%,46%)] to-[hsl(228,63%,48%)]',
    gradientBg: 'from-[hsl(205,96%,46%,0.08)] to-[hsl(228,63%,48%,0.04)]',
    image: dashboardImg,
    description: 'O Dashboard é a primeira tela que você vê ao entrar. Ele resume todo o seu negócio em tempo real: valor em estoque, entradas, saídas, gráfico diário de movimentações e indicadores de CMV.',
    features: [
      { icon: BarChart3, title: 'Valor em Estoque', text: 'Total do seu estoque atual em R$' },
      { icon: TrendingUp, title: 'Entradas e Saídas', text: 'Cards com totais do mês corrente' },
      { icon: Sparkles, title: 'CMV Automático', text: 'Custo de Mercadoria Vendida calculado automaticamente' },
    ],
    details: [
      { title: 'Cards Principais', content: 'Três cards no topo mostram Valor em Estoque, Total de Entradas e Total de Saídas do mês. Os valores atualizam em tempo real conforme você movimenta o estoque.' },
      { title: 'Gráfico de Movimentações', content: 'O gráfico de barras mostra dia a dia as entradas (azul) e saídas (rosa). Passe o mouse para ver valores exatos de cada dia.' },
      { title: 'Saldo Inicial e CMV %', content: 'O Saldo Inicial mostra quanto valia seu estoque no começo do mês. O CMV% indica quanto do valor das saídas foi gasto com mercadoria.', tips: ['Se aparecer "(estimado)", o sistema calculou retroativamente — no próximo mês será automático.'] },
    ],
  },
  {
    id: 'estoque',
    title: 'Estoque',
    subtitle: 'Seus produtos e insumos',
    icon: Package,
    gradient: 'from-[hsl(228,63%,48%)] to-[hsl(273,63%,42%)]',
    gradientBg: 'from-[hsl(228,63%,48%,0.08)] to-[hsl(273,63%,42%,0.04)]',
    image: estoqueImg,
    description: 'Cadastre todos os seus produtos e insumos com foto, custo, estoque mínimo, categorias e marcas. Configure unidades de compra e uso com conversão automática.',
    features: [
      { icon: Package, title: 'Cadastro Completo', text: 'Nome, custo, unidade, foto, códigos de barras' },
      { icon: Layers, title: 'Categorias e Marcas', text: 'Organize e filtre seus produtos' },
      { icon: Settings, title: 'Modo de Uso', text: 'Converta unidades automaticamente (ex: kg → g)' },
    ],
    details: [
      { title: 'Criar Produto', content: 'Clique em "+ Novo Produto". Na aba "Dados Gerais", preencha nome, unidade de compra, custo unitário, estoque atual e estoque mínimo. Adicione foto, categorias e marcas.' },
      { title: 'Modo de Uso (Conversão)', content: 'Se você compra em kg mas usa em gramas, vá na aba "Modo de Uso". Defina a unidade de uso e o fator de conversão (ex: 1 kg = 1000 g). O sistema converte automaticamente nas receitas.', tips: ['Muito útil para insumos como farinha, açúcar, temperos'] },
      { title: 'Histórico Geral', content: 'A segunda aba mostra todas as movimentações de todos os produtos, com data, tipo, motivo e valores.' },
    ],
  },
  {
    id: 'movimentacao',
    title: 'Movimentação',
    subtitle: 'Entradas e saídas do estoque',
    icon: TrendingUp,
    gradient: 'from-[hsl(273,63%,42%)] to-[hsl(315,82%,38%)]',
    gradientBg: 'from-[hsl(273,63%,42%,0.08)] to-[hsl(315,82%,38%,0.04)]',
    image: movimentacaoImg,
    description: 'Registre entradas e saídas de forma rápida usando o sistema de carrinho. Selecione vários produtos, configure cada um e confirme tudo de uma vez.',
    features: [
      { icon: ShoppingCart, title: 'Sistema de Carrinho', text: 'Adicione vários itens antes de confirmar' },
      { icon: MousePointerClick, title: 'Um Clique', text: 'Clique no produto para configurar a movimentação' },
      { icon: CheckCircle2, title: 'Motivos Detalhados', text: 'Compra, venda, perda, devolução e mais' },
    ],
    details: [
      { title: 'Selecionar Produto', content: 'Clique sobre um produto na lista. Uma janela abre para configurar: tipo (entrada ou saída), motivo, quantidade e custo aplicado.' },
      { title: 'Motivos de Entrada', content: 'Compra de fornecedor, devolução de cliente, ajuste de inventário, transferência, produção interna, doação recebida.' },
      { title: 'Motivos de Saída', content: 'Venda, consumo interno, perda/quebra, vencimento, devolução a fornecedor, ajuste, doação, transferência.' },
      { title: 'Carrinho', content: 'Após configurar, clique "Adicionar ao Carrinho". Repita para outros produtos. Quando tudo estiver pronto, confirme o carrinho — o estoque de todos os produtos atualiza de uma vez.', tips: ['Confira os itens antes de confirmar — não é possível desfazer.'] },
    ],
  },
  {
    id: 'receitas',
    title: 'Receitas',
    subtitle: 'Monte e precifique',
    icon: ChefHat,
    gradient: 'from-[hsl(315,82%,38%)] to-[hsl(340,91%,45%)]',
    gradientBg: 'from-[hsl(315,82%,38%,0.08)] to-[hsl(340,91%,45%,0.04)]',
    image: receitasImg,
    description: 'Monte receitas com ingredientes do estoque, sub-receitas, embalagens e mão de obra. O custo é calculado automaticamente. Vincule um markup e obtenha o preço de venda ideal.',
    features: [
      { icon: ChefHat, title: '6 Abas Completas', text: 'Geral, Ingredientes, Sub-receitas, Embalagens, Precificação, Projeção' },
      { icon: Calculator, title: 'Custo Automático', text: 'Atualiza quando preços de ingredientes mudam' },
      { icon: BarChart3, title: 'Projeção de Produção', text: 'Simule cenários de produção e faturamento' },
    ],
    details: [
      { title: 'Aba Geral', content: 'Nome da receita, rendimento (ex: 10 unidades), tempo de preparo, tipo de produto, foto e passos de preparo em sequência.' },
      { title: 'Aba Ingredientes', content: 'Adicione produtos do estoque como ingredientes. Defina a quantidade de cada um. O custo é calculado automaticamente usando o custo unitário (já convertido se tiver modo de uso).' },
      { title: 'Aba Sub-receitas', content: 'Se uma receita usa outra receita como base (ex: massa dentro de um bolo), adicione aqui. O custo da sub-receita entra no custo total.' },
      { title: 'Aba Embalagens', content: 'Adicione embalagens e recipientes. Eles também são produtos do estoque e entram no custo final.' },
      { title: 'Aba Precificação', content: 'Vincule um Markup à receita. O sistema calcula o preço de venda sugerido: Custo Total × Markup.', tips: ['Crie markups diferentes para canais diferentes (delivery, loja, atacado)'] },
      { title: 'Aba Projeção', content: 'Simule: se eu produzir X unidades, quanto vou gastar de ingredientes? Qual o faturamento esperado? Útil para planejar produção.' },
    ],
  },
  {
    id: 'custos',
    title: 'Custos',
    subtitle: 'Despesas, folha e encargos',
    icon: DollarSign,
    gradient: 'from-[hsl(340,91%,45%)] to-[hsl(25,95%,51%)]',
    gradientBg: 'from-[hsl(340,91%,45%,0.08)] to-[hsl(25,95%,51%,0.04)]',
    image: custosImg,
    description: 'Cadastre suas despesas fixas mensais, folha de pagamento com todos os encargos trabalhistas, e encargos sobre venda (taxas, impostos, comissões). Tudo isso alimenta o cálculo do Markup.',
    features: [
      { icon: CreditCard, title: 'Despesas Fixas', text: 'Aluguel, energia, internet — tudo organizado' },
      { icon: Building2, title: 'Folha de Pagamento', text: 'Salários, INSS, FGTS, férias, custo/hora' },
      { icon: DollarSign, title: 'Encargos sobre Venda', text: 'Taxas de cartão, impostos, comissões' },
    ],
    details: [
      { title: 'Despesas Fixas', content: 'Cadastre cada despesa com nome, valor mensal, dia de vencimento e categoria. Crie categorias personalizadas (ex: Utilidades, Infraestrutura). O total é usado no cálculo do Markup.' },
      { title: 'Folha de Pagamento', content: 'Cadastre funcionários: nome, cargo, salário base, tipo de mão de obra (direta/indireta), horas/dia, dias/semana. Configure encargos: INSS, FGTS, férias, RAT, vale-transporte, vale-refeição, plano de saúde.', tips: ['O custo por hora calculado pode ser usado na mão de obra das receitas.'] },
      { title: 'Encargos sobre Venda', content: 'Cadastre encargos que incidem sobre cada venda: taxa de cartão (%), comissões, impostos. Podem ser percentuais ou fixos. Entram no cálculo do Markup.' },
    ],
  },
  {
    id: 'precificacao',
    title: 'Precificação',
    subtitle: 'Defina seus preços',
    icon: Calculator,
    gradient: 'from-[hsl(25,95%,51%)] to-[hsl(205,96%,46%)]',
    gradientBg: 'from-[hsl(25,95%,51%,0.08)] to-[hsl(205,96%,46%,0.04)]',
    image: precificacaoImg,
    description: 'O coração do sistema! Crie Markups que consideram todas as suas despesas, encargos e margem de lucro desejada. O resultado é o preço de venda ideal para cada produto.',
    features: [
      { icon: BarChart3, title: 'Média de Faturamento', text: 'Base para calcular % das despesas' },
      { icon: Calculator, title: 'Markups Inteligentes', text: 'Fórmula: 100 / (100 - Despesas% - Encargos% - Margem%)' },
      { icon: Sparkles, title: 'Preço Sugerido', text: 'Custo × Markup = preço ideal de venda' },
    ],
    details: [
      { title: 'Média de Faturamento', content: 'Informe seu faturamento médio mensal. O sistema calcula quanto cada despesa fixa representa em percentual sobre o faturamento.' },
      { title: 'Criar Markup', content: 'Clique em "+ Novo Markup". Selecione quais despesas fixas, funcionários e encargos devem ser considerados. Defina a margem de lucro desejada (%).' },
      { title: 'Resultado', content: 'O sistema calcula o Markup Ideal automaticamente. Vincule-o às receitas para obter o preço de venda sugerido.', tips: ['Crie markups diferentes para cada canal de venda (loja, delivery, atacado)', 'O markup recalcula automaticamente quando despesas ou encargos mudam'] },
    ],
  },
];

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(205,96%,46%)] via-[hsl(273,63%,42%)] to-[hsl(340,91%,45%)] p-8 md:p-12 text-white">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <BookOpen className="h-4 w-4" />
          Guia Completo
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4">
          Aprenda a usar o<br />
          <span className="text-white/90">CalculaAi</span> por completo
        </h1>

        <p className="text-lg text-white/80 leading-relaxed max-w-lg">
          Um tutorial visual de cada tela e funcionalidade do sistema.
          Navegue pelas seções abaixo e domine todas as ferramentas.
        </p>
      </div>
    </div>
  );
}

function QuickNav({ activeSection, onNavigate }: { activeSection: string | null; onNavigate: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {sections.map((s) => {
        const Icon = s.icon;
        const isActive = activeSection === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onNavigate(s.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r text-white shadow-lg scale-105 ' + s.gradient
                : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border hover:shadow-sm'
            )}
          >
            <Icon className="h-4 w-4" />
            {s.title}
          </button>
        );
      })}
    </div>
  );
}

function SectionBlock({ section, index }: { section: TutorialSection; index: number }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = section.icon;
  const isEven = index % 2 === 0;

  return (
    <div id={section.id} className="scroll-mt-20">
      <div className={cn('rounded-3xl overflow-hidden bg-gradient-to-br border border-border/20', section.gradientBg)}>
        {/* Top gradient line */}
        <div className={cn('h-1.5 bg-gradient-to-r', section.gradient)} />

        <div className="p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className={cn('flex flex-col gap-8', isEven ? 'md:flex-row' : 'md:flex-row-reverse')}>
            {/* Image */}
            <div className="md:w-1/2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/20 group">
                <img
                  src={section.image}
                  alt={`Tela de ${section.title}`}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Text */}
            <div className="md:w-1/2 flex flex-col justify-center space-y-5">
              <div className="flex items-center gap-3">
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', section.gradient)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.subtitle}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                    {section.title}
                  </h2>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed text-base">
                {section.description}
              </p>

              {/* Feature pills */}
              <div className="space-y-3">
                {section.features.map((f, i) => {
                  const FIcon = f.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 bg-card/60 backdrop-blur-sm rounded-xl p-3 border border-border/20">
                      <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0', section.gradient)}>
                        <FIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{f.title}</p>
                        <p className="text-xs text-muted-foreground">{f.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                  'inline-flex items-center gap-2 text-sm font-semibold transition-colors',
                  'bg-gradient-to-r bg-clip-text text-transparent',
                  section.gradient
                )}
              >
                {showDetails ? 'Ocultar detalhes' : 'Ver passo a passo'}
                <ChevronDown className={cn('h-4 w-4 transition-transform text-primary', showDetails && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Expanded details */}
          {showDetails && (
            <div className="animate-fade-in space-y-4 pt-2">
              <Separator className="bg-border/30" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.details.map((detail, i) => (
                  <Card key={i} className="glass-card border-border/20 rounded-2xl">
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white', section.gradient)}>
                          {i + 1}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground">{detail.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{detail.content}</p>
                      {detail.tips?.map((tip, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs bg-primary/5 rounded-lg px-3 py-2 mt-2">
                          <span className="mt-px">💡</span>
                          <span className="text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleNavigate = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <HeroSection />
      <QuickNav activeSection={activeSection} onNavigate={handleNavigate} />

      <div className="space-y-8">
        {sections.map((section, i) => (
          <SectionBlock key={section.id} section={section} index={i} />
        ))}
      </div>

      {/* Footer CTA */}
      <Card className="glass-card border-border/20 rounded-3xl overflow-hidden">
        <div className={cn('h-1.5 bg-gradient-to-r from-[hsl(205,96%,46%)] via-[hsl(273,63%,42%)] to-[hsl(25,95%,51%)]')} />
        <CardContent className="p-8 text-center space-y-4">
          <h3 className="text-xl font-bold font-display text-foreground">
            Pronto para começar? 🚀
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Agora que você conhece todas as funcionalidades, comece cadastrando seus produtos no Estoque e monte sua primeira receita!
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => window.location.href = '/estoque'}
              className="bg-gradient-to-r from-[hsl(205,96%,46%)] to-[hsl(228,63%,48%)] text-white rounded-full gap-2"
            >
              <Package className="h-4 w-4" />
              Ir para Estoque
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => window.location.href = '/receitas'}
              variant="outline"
              className="rounded-full gap-2"
            >
              <ChefHat className="h-4 w-4" />
              Ir para Receitas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
