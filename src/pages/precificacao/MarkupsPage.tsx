import { useSearchParams } from 'react-router-dom';
import { Markups } from '@/components/precificacao/Markups';

export default function MarkupsPage() {
  const [searchParams] = useSearchParams();
  const globalPeriod = searchParams.get('periodo') || '12';
  return <div className="space-y-4"><Markups globalPeriod={globalPeriod} /></div>;
}
