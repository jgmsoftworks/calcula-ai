import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ProducaoBoard, type BoardTask } from '../../src/components/producao/ProducaoBoard';
import type { ProducaoStatus } from '../../src/hooks/useProducaoTarefas';
import '../../src/index.css';

// Real board and sensors, synthetic local state. This entry is not part of the app build.
export default function BoardFixture() {
  const [tasks,setTasks]=useState<BoardTask[]>([
    {id:'one',titulo:'Bolo de cenoura',status:'a_fazer',funcionario:{nome:'Ana'}},
    {id:'two',titulo:'Torta de morango',status:'a_fazer',funcionario:{nome:'Bia'}},
  ]);
  const [search,setSearch]=useState('');
  const [events,setEvents]=useState<string[]>([]);
  const move=(task:BoardTask,status:ProducaoStatus)=>{
    setTasks(current=>current.map(t=>t.id===task.id?{...t,status}:t));
    setEvents(current=>[...current,`${task.id}:${status}`]);
  };
  return <main style={{padding:24,maxWidth:1400,margin:'auto'}}>
    <label>Buscar tarefa<input aria-label="Buscar tarefa" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <output aria-label="Movimentações">{events.join(',')}</output>
    <ProducaoBoard tasks={tasks.filter(t=>t.titulo.toLowerCase().includes(search.toLowerCase()))} pendingIds={new Set()} allowReorder={!search}
      onMove={move} onAdvance={task=>move(task,task.status==='a_fazer'?'em_producao':'feito')}
      onEdit={()=>setEvents(current=>[...current,'edit'])}
      onReorder={(status,column)=>{setTasks(current=>[...current.filter(t=>t.status!==status),...column]);setEvents(current=>[...current,'order']);}}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<BoardFixture/>);
