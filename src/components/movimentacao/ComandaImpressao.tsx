import { format } from 'date-fns';
import { formatters } from '@/lib/formatters';
import type { ItemCarrinho } from './CarrinhoLateral';

interface ComandaImpressaoProps {
  numeroComanda: string;
  tenant: {
    nome: string;
    cnpj?: string;
  };
  funcionario: string;
  motivo: string;
  dataMovimentacao: Date;
  carrinho: ItemCarrinho[];
  observacao?: string;
}

export function imprimirComanda({
  numeroComanda,
  tenant,
  funcionario,
  motivo,
  dataMovimentacao,
  carrinho,
  observacao,
}: ComandaImpressaoProps) {
  const total = carrinho.reduce((sum, item) => sum + item.valor_total, 0);

  const htmlComanda = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Comanda ${numeroComanda}</title>
      <style>
        @media print {
          body { margin: 0; padding: 10mm; }
          @page { size: 80mm auto; margin: 0; }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12pt;
          width: 80mm;
          margin: 0 auto;
        }
        .cabecalho {
          text-align: center;
          border-bottom: 2px solid #000;
          margin-bottom: 10px;
          padding-bottom: 10px;
        }
        .titulo { 
          font-size: 16pt; 
          font-weight: bold; 
          margin-bottom: 5px;
        }
        .info { 
          margin: 5px 0; 
          font-size: 11pt;
        }
        .secao {
          margin: 10px 0;
        }
        .tabela { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 10px 0; 
        }
        .tabela th, .tabela td { 
          text-align: left; 
          padding: 5px 2px; 
          border-bottom: 1px dashed #000;
          font-size: 10pt;
        }
        .tabela th { 
          font-weight: bold;
          border-bottom: 2px solid #000;
        }
        .tabela .direita { text-align: right; }
        .total {
          text-align: right;
          font-size: 14pt;
          font-weight: bold;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #000;
        }
        .rodape {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #000;
          font-size: 10pt;
        }
        .linha-dupla {
          border-top: 2px double #000;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="cabecalho">
        <div class="titulo">${tenant.nome || 'COMANDA'}</div>
        ${tenant.cnpj ? `<div class="info">CNPJ: ${tenant.cnpj}</div>` : ''}
        <div class="linha-dupla"></div>
        <div class="info"><strong>COMANDA: ${numeroComanda}</strong></div>
        <div class="info">DATA: ${format(dataMovimentacao, 'dd/MM/yyyy')}  HORA: ${format(dataMovimentacao, 'HH:mm')}</div>
      </div>
      
      <div class="secao">
        <div class="info"><strong>OPERADOR:</strong> ${funcionario}</div>
        <div class="info"><strong>MOTIVO:</strong> ${motivo}</div>
      </div>
      
      <table class="tabela">
        <thead>
          <tr>
            <th>PRODUTO</th>
            <th class="direita">QTD</th>
            <th>UM</th>
            <th class="direita">UNIT</th>
            <th class="direita">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${carrinho.map(item => `
            <tr>
              <td>${item.nome.substring(0, 20)}</td>
              <td class="direita">${formatters.quantidadeContinua(item.quantidade)}</td>
              <td>${item.unidade}</td>
              <td class="direita">${formatters.valor(item.valor_unitario).replace('R$ ', '')}</td>
              <td class="direita">${formatters.valor(item.valor_total).replace('R$ ', '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="total">
        TOTAL: ${formatters.valor(total)}
      </div>
      
      ${observacao ? `
        <div class="rodape">
          <div><strong>OBSERVAÇÕES:</strong></div>
          <div style="margin-top: 5px;">${observacao}</div>
        </div>
      ` : ''}
      
      <div class="rodape" style="margin-top: 30px;">
        <div>ASSINATURA:</div>
        <div style="margin-top: 10px; border-bottom: 1px solid #000; width: 100%;"></div>
        <div style="margin-top: 15px;">DATA: ____/____/________</div>
      </div>
      
      <div class="linha-dupla"></div>
    </body>
    </html>
  `;

  const janela = window.open('', '_blank');
  if (janela) {
    janela.document.write(htmlComanda);
    janela.document.close();
    janela.print();
  }
}
