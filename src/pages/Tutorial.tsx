import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  BookOpen,
  ArrowRight,
  Package,
  ChefHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sections, TutorialSection, SubScreen } from '@/data/tutorialData';

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(205,96%,46%)] via-[hsl(273,63%,42%)] to-[hsl(340,91%,45%)] p-8 md:p-12 text-white">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <BookOpen className="h-4 w-4" />
          Guia Completo e Detalhado
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-tight mb-4">
          Aprenda a usar o<br />
          <span className="text-white/90">CalculaAi</span> por completo
        </h1>
        <p className="text-lg text-white/80 leading-relaxed max-w-lg">
          Um tutorial visual e detalhado de cada tela, modal e funcionalidade do sistema.
          Com prints reais e explicações passo a passo.
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

function SubScreenCard({ sub, index, gradient }: { sub: SubScreen; index: number; gradient: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-sm font-bold text-white shrink-0', gradient)}>
          {index + 1}
        </span>
        <h4 className="text-lg font-bold text-foreground">{sub.title}</h4>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-xl border border-border/20">
        <img
          src={sub.image}
          alt={sub.title}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      <p className="text-muted-foreground leading-relaxed">{sub.description}</p>

      <ul className="space-y-2">
        {sub.bullets.map((bullet, i) => {
          const parts = bullet.split('**');
          return (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>
                {parts.map((part, j) =>
                  j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{part}</strong> : part
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {sub.tips && sub.tips.length > 0 && (
        <div className="space-y-2">
          {sub.tips.map((tip, j) => (
            <div key={j} className="flex items-start gap-2 text-xs bg-primary/5 rounded-lg px-3 py-2">
              <span className="mt-px">💡</span>
              <span className="text-muted-foreground">{tip}</span>
            </div>
          ))}
        </div>
      )}
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
        <div className={cn('h-1.5 bg-gradient-to-r', section.gradient)} />

        <div className="p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className={cn('flex flex-col gap-8', isEven ? 'md:flex-row' : 'md:flex-row-reverse')}>
            <div className="md:w-1/2">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/20 group">
                <img
                  src={section.mainImage}
                  alt={`Tela de ${section.title}`}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>

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
                {section.intro}
              </p>

              <div className="text-sm text-muted-foreground">
                📸 <strong className="text-foreground">{section.subScreens.length} telas detalhadas</strong> com explicação completa
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                  'inline-flex items-center gap-2 text-sm font-semibold transition-colors',
                  'bg-gradient-to-r bg-clip-text text-transparent',
                  section.gradient
                )}
              >
                {showDetails ? 'Ocultar detalhes' : 'Ver telas e explicações detalhadas'}
                <ChevronDown className={cn('h-4 w-4 transition-transform text-primary', showDetails && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Expanded sub-screens */}
          {showDetails && (
            <div className="animate-fade-in space-y-8 pt-2">
              <Separator className="bg-border/30" />
              {section.subScreens.map((sub, i) => (
                <div key={i}>
                  <Card className="glass-card border-border/20 rounded-2xl">
                    <CardContent className="p-6 md:p-8">
                      <SubScreenCard sub={sub} index={i} gradient={section.gradient} />
                    </CardContent>
                  </Card>
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
            Agora que você conhece todas as funcionalidades em detalhe, comece cadastrando seus produtos no Estoque e monte sua primeira receita!
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
