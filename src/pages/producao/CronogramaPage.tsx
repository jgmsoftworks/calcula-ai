import { ClipboardList } from 'lucide-react';

export default function CronogramaPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Cronograma
          </h1>
          <p className="text-sm text-muted-foreground">
            Planeje e organize seu cronograma de produção.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-12 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-base font-medium text-foreground">Em breve</p>
        <p className="text-sm text-muted-foreground mt-1">
          A área de cronograma será construída aqui.
        </p>
      </div>
    </div>
  );
}
