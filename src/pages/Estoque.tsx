import { useParams, Navigate } from 'react-router-dom';
import { ListaProdutos } from '@/components/estoque/ListaProdutos';
import { HistoricoGeral } from '@/components/estoque/HistoricoGeral';
import Movimentacao from '@/pages/Movimentacao';

export default function Estoque() {
  const { secao } = useParams<{ secao?: string }>();

  if (!secao) return <Navigate to="/estoque/produtos" replace />;

  if (secao === 'historico') {
    return <div className="space-y-6"><HistoricoGeral /></div>;
  }

  if (secao === 'produtos') {
    return <div className="space-y-6"><ListaProdutos /></div>;
  }

  if (secao === 'movimentacao') {
    return <div className="space-y-6"><Movimentacao /></div>;
  }

  return <Navigate to="/estoque/produtos" replace />;
}
