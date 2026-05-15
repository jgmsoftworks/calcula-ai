import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/lovable-uploads/4b01991e-20ff-46b8-bab0-32a10b4650a6.png"
              alt="Calcula Ai"
              className="h-7 w-auto"
            />
            <span className="font-display font-bold text-sm sm:text-base text-gradient-brand">CalculaAi</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-h1:text-3xl prose-h1:mb-2 prose-a:text-primary">
          <h1>{title}</h1>
          <p className="text-sm text-muted-foreground !mt-0">
            Última atualização: <strong>{lastUpdated}</strong> · Versão 1.0.0
          </p>
          <hr className="my-6" />
          {children}
        </article>
      </main>

      <footer className="border-t border-border/40 mt-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link to="/politica-de-privacidade" className="hover:text-primary">
            Política de Privacidade
          </Link>
          <span aria-hidden>·</span>
          <Link to="/termos-de-uso" className="hover:text-primary">
            Termos de Uso
          </Link>
          <span aria-hidden>·</span>
          <Link to="/cookies" className="hover:text-primary">
            Cookies
          </Link>
          <span aria-hidden>·</span>
          <span>© {new Date().getFullYear()} Calcula Ai</span>
        </div>
      </footer>
    </div>
  );
}
