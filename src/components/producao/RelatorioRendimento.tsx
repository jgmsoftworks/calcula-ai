import { totaisRendimento, type LinhaRendimento } from '@/lib/totaisRendimento';
import { formatarRendimento, type ProducaoRendimento } from '@/lib/producaoRendimento';



export function RelatorioRendimento({ tarefas }: { tarefas: LinhaRendimento[] }) {
  const concluidas = tarefas.filter(item => item.status === 'feito' && (item.receita_id || item.receita_nome || item.rendimento_previsto != null));
  const totais = totaisRendimento(concluidas);
  const quantidade = (value: number | null | undefined, unit?: string | null) => value == null ? 'Não informado' : `${formatarRendimento(value)} ${unit || ''}`;
  const diferenca = (item: ProducaoRendimento) => item.rendimento_real == null || !item.rendimento_previsto ? '—'
    : `${item.rendimento_real > item.rendimento_previsto ? '+' : ''}${formatarRendimento(item.rendimento_real - item.rendimento_previsto)} ${item.rendimento_unidade || ''}`;
  return <section aria-label="Rendimento da produção" className="overflow-hidden rounded-xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b p-5"><h2 className="font-semibold">Rendimento da produção</h2><span className="text-sm text-muted-foreground">{concluidas.length} produções concluídas</span></div>
    {!concluidas.length ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma produção de receita concluída neste período.</p> : <>
      <div className="divide-y sm:hidden">{concluidas.map(item => <article key={item.id} className="space-y-3 p-4">
        <div><p className="break-words font-medium">{item.receita_nome || item.receita?.nome || item.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{item.data_producao.split('-').reverse().join('/')} · {item.funcionario?.nome || 'Sem responsável'}</p></div>
        <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Previsto</dt><dd>{quantidade(item.rendimento_previsto,item.rendimento_unidade)}</dd></div><div><dt className="text-xs text-muted-foreground">Realizado</dt><dd className="font-semibold">{quantidade(item.rendimento_real,item.rendimento_unidade)}</dd></div><div className="col-span-2"><dt className="text-xs text-muted-foreground">Diferença</dt><dd>{diferenca(item)}</dd></div></dl>
      </article>)}</div>
      <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="p-4">Data / receita</th><th className="p-4">Responsável</th><th className="p-4 text-right">Previsto</th><th className="p-4 text-right">Realizado</th><th className="p-4 text-right">Diferença</th></tr></thead><tbody>{concluidas.map(item => <tr key={item.id} className="border-t"><td className="p-4"><p className="break-words font-medium">{item.receita_nome || item.receita?.nome || item.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{item.data_producao.split('-').reverse().join('/')} · {item.titulo}</p></td><td className="p-4">{item.funcionario?.nome || '—'}</td><td className="p-4 text-right tabular-nums">{quantidade(item.rendimento_previsto,item.rendimento_unidade)}</td><td className="p-4 text-right font-semibold tabular-nums">{quantidade(item.rendimento_real,item.rendimento_unidade)}</td><td className="p-4 text-right tabular-nums">{diferenca(item)}</td></tr>)}</tbody></table></div>
      {totais.length > 0 && <div className="space-y-2 border-t bg-muted/20 p-4">{totais.map(total => <p key={total.unidade} className="flex flex-wrap justify-between gap-2 text-sm"><span>Total comparável ({total.unidade}) · {total.producoes} produções</span><strong className="tabular-nums">{formatarRendimento(total.previsto)} previsto · {formatarRendimento(total.real)} realizado · {total.real > total.previsto ? '+' : ''}{formatarRendimento(total.real-total.previsto)} de diferença</strong></p>)}</div>}
      {concluidas.some(item => item.rendimento_real == null || item.rendimento_previsto == null) && <p className="border-t px-4 py-3 text-xs text-muted-foreground">Produções sem rendimento registrado aparecem como não informado e não entram nos totais comparáveis.</p>}
    </>}
  </section>;
}
