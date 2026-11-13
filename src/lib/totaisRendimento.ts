import type { ProducaoRendimento } from './producaoRendimento';

export type LinhaRendimento = ProducaoRendimento & { id: string; titulo: string; data_producao: string; funcionario?: { nome: string } | null };

export function totaisRendimento(tarefas: LinhaRendimento[]) {
  const grupos = new Map<string, { unidade: string; previsto: number; real: number; producoes: number }>();
  for (const tarefa of tarefas) {
    if (tarefa.status !== 'feito' || tarefa.rendimento_real == null || !tarefa.rendimento_previsto || !tarefa.rendimento_unidade) continue;
    const unidade = tarefa.rendimento_unidade.trim();
    const grupo = grupos.get(unidade) ?? { unidade, previsto: 0, real: 0, producoes: 0 };
    grupo.previsto += tarefa.rendimento_previsto; grupo.real += tarefa.rendimento_real; grupo.producoes++;
    grupos.set(unidade, grupo);
  }
  return [...grupos.values()];
}
