import { expect,it,vi } from 'vitest';
import { imprimirProducao } from './producaoPdf';
import type { ProducaoTarefa } from '@/hooks/useProducaoTarefas';
const pdf=vi.hoisted(()=>({text:vi.fn(),page:vi.fn(),wrap:vi.fn((text:string)=>text.match(/.{1,50}/g)??[]),save:vi.fn()}));
vi.mock('jspdf',()=>({default:class {internal={pageSize:{getWidth:()=>210}};setFont(){}setFontSize(){}text=pdf.text;addPage=pdf.page;splitTextToSize=pdf.wrap;save=pdf.save;}}));
it('prints planned/actual yield, wraps every line and paginates long content',async()=>{
  const task={id:'t',titulo:'Torta de frutas '.repeat(20),status:'feito',funcionario:{nome:'Ana'},receita_id:'r',receita_nome:'Torta',rendimento_previsto:12,rendimento_real:0,rendimento_unidade:'un',observacoes:'Observações longas '.repeat(500)} as ProducaoTarefa;
  await imprimirProducao('2026-11-11',[task],'Filtros aplicados');
  expect(pdf.wrap).toHaveBeenCalledWith('Previsto: 12 un · Realizado: 0 un',182);expect(pdf.page).toHaveBeenCalled();expect(pdf.text.mock.calls.every(([,x,y])=>x===14&&y<=278)).toBe(true);expect(pdf.save).toHaveBeenCalledWith('producao-2026-11-11.pdf');
});
