import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { BuscaProduto } from '@/components/movimentacao/BuscaProduto';
import { CarrinhoMovimentacao } from '@/components/movimentacao/CarrinhoMovimentacao';

export default function Movimentacao() {
  const [carrinho, setCarrinho] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BuscaProduto onAddToCart={(item) => setCarrinho([...carrinho, item])} />
        </div>
        <div>
          <CarrinhoMovimentacao carrinho={carrinho} onCarrinhoChange={setCarrinho} />
        </div>
      </div>
    </div>
  );
}
