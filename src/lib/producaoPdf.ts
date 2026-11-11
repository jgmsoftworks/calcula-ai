import type { ProducaoTarefa } from '@/hooks/useProducaoTarefas';
import { formatInTimeZone } from 'date-fns-tz';
import { getBusinessRegion } from '@/lib/business-region';
import { rendimentoDaTarefa, temReceitaProducao, formatarRendimento } from '@/lib/producaoRendimento';

export async function imprimirProducao(date:string,tasks:ProducaoTarefa[],scope:string) {
  const {default:jsPDF}=await import('jspdf');
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const width=doc.internal.pageSize.getWidth()-28;
  let y=18;
  const line=(text:string,bold=false,size=10)=>{
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
    for(const row of doc.splitTextToSize(text,width) as string[]){
      if(y>278){doc.addPage();y=18;}
      doc.text(row,14,y);y+=size===16?8:5;
    }
  };
  line('Produção do dia',true,16);line(`${date.split('-').reverse().join('/')} · ${scope} · ${tasks.length} tarefas`);y+=5;
  const names={a_fazer:'A fazer',em_producao:'Em produção',feito:'Feito'};
  const time=(value:string)=>formatInTimeZone(value,getBusinessRegion().timeZone,'dd/MM HH:mm');
  for(const status of ['a_fazer','em_producao','feito'] as const){
    const items=tasks.filter(t=>t.status===status);if(!items.length)continue;
    line(`${names[status]} (${items.length})`,true,12);y+=2;
    for(const t of items){
      line(t.titulo,true);line(`Responsável: ${t.funcionario?.nome??'Não informado'}${t.area?` · Área: ${t.area.nome}`:''}`);
      if(t.cancelado_em)line('Tarefa cancelada');
      if(temReceitaProducao(t)){
        const r=rendimentoDaTarefa(t);
        line(`Receita: ${t.receita?.nome??t.receita_nome??'Não informada'}`);
        line(`Previsto: ${r.previsto===null?'Não informado':`${formatarRendimento(r.previsto)} ${r.unidade}`} · Realizado: ${r.real===null?'Não informado':`${formatarRendimento(r.real)} ${r.unidade}`}`);
      }
      if(t.inicio_previsto||t.fim_previsto)line(`Horário previsto: ${t.inicio_previsto?time(t.inicio_previsto):'—'} até ${t.fim_previsto?time(t.fim_previsto):'—'}`);
      if(t.observacoes)line(`Observações: ${t.observacoes}`);
      y+=5;
    }
  }
  doc.save(`producao-${date}.pdf`);
}
