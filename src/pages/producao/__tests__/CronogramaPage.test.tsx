import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import CronogramaPage from '../CronogramaPage';
const mocks = vi.hoisted(() => ({ criar: vi.fn(), atualizar: vi.fn(), remover: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/i18n/localizeText', () => ({ localizeText: (text: string) => text }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'pt-BR' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: () => query, order: () => Promise.resolve({ data: table === 'folha_pagamento' ? [{id:'employee',nome:'Ana',cargo:'Confeiteira'}] : [] }) };
  return query;
} } }));
vi.mock('@/hooks/useProducaoAreas', () => ({ useProducaoAreas: () => ({
  data: [{id:'area',nome:'Confeitaria',cor:'#0088ee'}], isLoading:false,
  criar:{mutateAsync:mocks.criar},atualizar:{mutateAsync:mocks.atualizar},remover:{mutate:mocks.remover},
}) }));
vi.mock('@/hooks/useProducaoRecorrentes', () => ({ useProducaoRecorrentes: () => ({
  data: [
    {id:'late',area_id:'area',titulo:'Recheios',dias_semana:[1,3],hora_inicio:'13:00:00',hora_fim:'14:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'early',area_id:'area',titulo:'Assar bolos',dias_semana:[1],hora_inicio:'07:30:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'unscheduled',area_id:'area',titulo:'Organizar formas',dias_semana:[1],hora_inicio:null,funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'tuesday',area_id:'area',titulo:'Pães',dias_semana:[2],hora_inicio:'09:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'unassigned',area_id:null,titulo:'Conferir estoque',dias_semana:[1],hora_inicio:'08:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
  ], isLoading:false,
  criar:{mutateAsync:mocks.criar},atualizar:{mutateAsync:mocks.atualizar},remover:{mutate:mocks.remover},
}) }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
describe('Daily recurring schedule', () => {
  it('starts on today and switches days, showing ordered tasks and totals only for that day', async () => {
    render(<CronogramaPage />);
    const labels=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    expect(screen.getByRole('button',{name:`Ver ${labels[new Date().getDay()]}`})).toHaveAttribute('aria-pressed','true');
    fireEvent.click(screen.getByRole('button',{name:'Ver Segunda'}));
    const day=screen.getByRole('region',{name:'Cronograma de Segunda'});
    const area=within(day).getByRole('region',{name:'Confeitaria'});
    expect(within(area).getAllByRole('button',{name:/Editar tarefa/}).map(button=>button.getAttribute('aria-label')))
      .toEqual(['Editar tarefa Assar bolos','Editar tarefa Recheios','Editar tarefa Organizar formas']);
    expect(within(day).getByText('Conferir estoque')).toBeInTheDocument();
    expect(within(day).getByText('13:00 – 14:00')).toBeInTheDocument();
    expect(screen.getByText('4 tarefas no dia')).toBeInTheDocument();
    expect(screen.queryByText('Pães')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Ver Terça'}));
    expect(screen.getByText('Pães')).toBeInTheDocument();
    expect(screen.getByText('1 tarefa no dia')).toBeInTheDocument();
    expect(screen.queryByText('Recheios')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Ver Domingo'}));
    expect(screen.queryByRole('button',{name:/Editar tarefa/})).not.toBeInTheDocument();
    expect(screen.getByText('0 tarefas no dia')).toBeInTheDocument();
    expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.atualizar).not.toHaveBeenCalled();
  });
  it('prefills the selected day for new tasks but keeps all recurrence days when editing', async () => {
    render(<CronogramaPage />);
    fireEvent.click(screen.getByRole('button',{name:'Ver Segunda'}));
    fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
    let dialog=within(screen.getByRole('dialog',{name:'Nova tarefa recorrente'}));
    expect(dialog.getByTitle('Segunda')).toHaveAttribute('aria-pressed','true');
    expect(dialog.getByTitle('Quarta')).toHaveAttribute('aria-pressed','false');
    fireEvent.click(dialog.getByRole('button',{name:'Cancelar'}));
    fireEvent.click(screen.getByRole('button',{name:'Ver Terça'}));
    fireEvent.click(screen.getByRole('button',{name:'Adicionar tarefa em Confeitaria'}));
    dialog=within(screen.getByRole('dialog',{name:'Nova tarefa recorrente'}));
    expect(dialog.getByTitle('Terça')).toHaveAttribute('aria-pressed','true');
    expect(dialog.getAllByRole('combobox')[0]).toHaveTextContent('Confeitaria');
    fireEvent.click(dialog.getByRole('button',{name:'Cancelar'}));
    fireEvent.click(screen.getByRole('button',{name:'Ver Quarta'}));
    fireEvent.click(screen.getByRole('button',{name:'Editar tarefa Recheios'}));
    dialog=within(screen.getByRole('dialog',{name:'Editar tarefa recorrente'}));
    expect(dialog.getByTitle('Segunda')).toHaveAttribute('aria-pressed','true');
    expect(dialog.getByTitle('Quarta')).toHaveAttribute('aria-pressed','true');
    expect(dialog.getByTitle('Terça')).toHaveAttribute('aria-pressed','false');
  });
});
