import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useOrdensProducao } from '@/hooks/useOrdensProducao';
import { OrdensCalendario } from '@/components/ordens-producao/OrdensCalendario';
import { format } from 'date-fns';

export default function OrdensProducao() {
  const { ordens, loading } = useOrdensProducao();
  const navigate = useNavigate();

  const handleSelectDay = (date: Date) => {
    navigate(`/ordens-producao/dia/${format(date, 'yyyy-MM-dd')}`);
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <OrdensCalendario ordens={ordens} onSelectDay={handleSelectDay} />

          {ordens.length === 0 && (
            <Card className="p-8 text-center bg-muted/30 border-dashed">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique em qualquer dia do calendário para visualizar e criar ordens de produção.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
