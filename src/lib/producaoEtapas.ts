import type { ProducaoStatus } from '@/hooks/useProducaoTarefas';

export const ETAPAS: {id:ProducaoStatus;nome:string;cor:string}[] = [
  {id:'a_fazer',nome:'A fazer',cor:'bg-slate-400'},
  {id:'em_producao',nome:'Em produção',cor:'bg-primary'},
  {id:'feito',nome:'Feito',cor:'bg-emerald-500'},
];
