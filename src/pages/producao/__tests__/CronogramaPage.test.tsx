import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import CronogramaPage from '../CronogramaPage';
import RecorrenteEditorPage from '../RecorrenteEditorPage';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
function renderSchedule(path = '/producao/cronograma') {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <MemoryRouter initialEntries={[path]}><Routes>
      <Route path="/producao/cronograma" element={<CronogramaPage />} />
      <Route path="/producao/cronograma/nova" element={<RecorrenteEditorPage />} />
      <Route path="/producao/cronograma/:id/editar" element={<RecorrenteEditorPage />} />
    </Routes></MemoryRouter>
  </QueryClientProvider>);
}
async function choose(label: string, query: string, searchLabel: string) {
  fireEvent.keyDown(screen.getByLabelText(label), {key:'ArrowDown'});
  const search=await screen.findByRole('textbox',{name:searchLabel});
  fireEvent.change(search,{target:{value:query}});
  fireEvent.keyDown(search,{key:'Enter'});
}

const mocks = vi.hoisted(() => ({ criar: vi.fn(), atualizar: vi.fn(), remover: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/i18n/localizeText', () => ({ localizeText: (text: string) => text }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'pt-BR' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: () => query, order: () => query, range: () => Promise.resolve({ data: table === 'folha_pagamento' ? [{id:'employee',nome:'Ana',cargo:'Confeiteira'}] : [
    {id:'recipe',nome:'Massa de cenoura',imagem_url:'https://example.com/cenoura.jpg',rendimento_valor:12,rendimento_unidade:'un'},
    {id:'second',nome:'Recheio de brigadeiro',imagem_url:null,rendimento_valor:2,rendimento_unidade:'kg'},
    {id:'invalid',nome:'Sem rendimento',imagem_url:null,rendimento_valor:null,rendimento_unidade:null},
  ] }) };
  return query;
} } }));
vi.mock('@/hooks/useProducaoAreas', () => ({ useProducaoAreas: () => ({
  data: [{id:'area',nome:'Confeitaria',cor:'#0088ee'}], isLoading:false,
  criar:{mutateAsync:mocks.criar},atualizar:{mutateAsync:mocks.atualizar},remover:{mutate:mocks.remover,mutateAsync:mocks.remover},
}) }));
vi.mock('@/hooks/useProducaoRecorrentes', () => ({ useProducaoRecorrentes: () => ({
  data: [
    {id:'late',area_id:'area',titulo:'Recheios',dias_semana:[1,3],hora_inicio:'13:00:00',hora_fim:'14:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'early',area_id:'area',titulo:'Assar bolos',dias_semana:[1],hora_inicio:'07:30:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'unscheduled',area_id:'area',titulo:'Organizar formas',dias_semana:[1],hora_inicio:null,funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'tuesday',area_id:'area',titulo:'Pães',dias_semana:[2],hora_inicio:'09:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
    {id:'unassigned',area_id:null,titulo:'Conferir estoque',dias_semana:[1],hora_inicio:'08:00:00',funcionario_id:'employee',funcionario:{nome:'Ana'}},
  ], isLoading:false,
  criar:{mutateAsync:mocks.criar},atualizar:{mutateAsync:mocks.atualizar},remover:{mutate:mocks.remover,mutateAsync:mocks.remover},
}) }));
beforeEach(() => { vi.resetAllMocks(); mocks.criar.mockResolvedValue({id:'created'}); mocks.atualizar.mockResolvedValue(undefined); mocks.remover.mockResolvedValue(undefined); });
afterEach(cleanup);
describe('Daily recurring schedule', () => {
  it('starts on today and switches days, showing ordered tasks and totals only for that day', async () => {
    renderSchedule();
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
    renderSchedule();
    fireEvent.click(screen.getByRole('button',{name:'Ver Segunda'}));
    fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));
    let form=within(await screen.findByRole('form',{name:'Nova tarefa recorrente'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(form.getByTitle('Segunda')).toHaveAttribute('aria-pressed','true');
    expect(form.getByTitle('Quarta')).toHaveAttribute('aria-pressed','false');
    fireEvent.click(form.getByRole('button',{name:'Cancelar'}));
    await screen.findByRole('region',{name:'Cronograma de Segunda'});
    fireEvent.click(screen.getByRole('button',{name:'Ver Terça'}));
    fireEvent.click(screen.getByRole('button',{name:'Adicionar tarefa em Confeitaria'}));
    form=within(await screen.findByRole('form',{name:'Nova tarefa recorrente'}));
    expect(form.getByTitle('Terça')).toHaveAttribute('aria-pressed','true');
    expect(form.getAllByRole('combobox')[0]).toHaveTextContent('Confeitaria');
    fireEvent.click(form.getByRole('button',{name:'Cancelar'}));
    await screen.findByRole('region',{name:'Cronograma de Terça'});
    fireEvent.click(screen.getByRole('button',{name:'Ver Quarta'}));
    fireEvent.click(screen.getByRole('button',{name:'Editar tarefa Recheios'}));
    form=within(await screen.findByRole('form',{name:'Editar tarefa recorrente'}));
    expect(form.getByTitle('Segunda')).toHaveAttribute('aria-pressed','true');
    expect(form.getByTitle('Quarta')).toHaveAttribute('aria-pressed','true');
    expect(form.getByTitle('Terça')).toHaveAttribute('aria-pressed','false');
  });
  it('selects and changes recipes with photos, calculates yield and saves the complete draft once', async () => {
    renderSchedule('/producao/cronograma/nova?dia=2&area=area');
    await screen.findByRole('form',{name:'Nova tarefa recorrente'});
    fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Assar massa'}});
    fireEvent.change(screen.getByLabelText('Observações (opcional)'),{target:{value:'Separar as formas'}});
    fireEvent.change(screen.getByLabelText('Início'),{target:{value:'07:30'}});
    fireEvent.change(screen.getByLabelText('Fim'),{target:{value:'12:00'}});
    await choose('Responsável','Ana','Buscar responsável');
    await choose('Receita (opcional)','cenoura','Buscar receita');
    expect(screen.getByRole('img',{name:'Massa de cenoura'})).toHaveAttribute('src','https://example.com/cenoura.jpg');
    expect(screen.getByLabelText('Rendimento previsto')).toHaveValue('12 un');
    fireEvent.change(screen.getByLabelText('Vezes da receita'),{target:{value:'6'}});
    expect(screen.getByLabelText('Rendimento previsto')).toHaveValue('72 un');
    await choose('Receita (opcional)','brigadeiro','Buscar receita');
    expect(screen.getByLabelText('Rendimento previsto')).toHaveValue('2 kg');
    expect(screen.getByLabelText('Vezes da receita')).toHaveValue('1');
    await choose('Receita (opcional)','cenoura','Buscar receita');
    fireEvent.change(screen.getByLabelText('Vezes da receita'),{target:{value:'6'}});
    expect(screen.getByLabelText('Observações (opcional)')).toHaveValue('Separar as formas');
    expect(screen.getByLabelText('Título da tarefa')).toHaveValue('Assar massa');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Criar tarefa'}));
    await screen.findByRole('region',{name:'Cronograma de Terça'});
    expect(mocks.criar).toHaveBeenCalledExactlyOnceWith({area_id:'area',titulo:'Assar massa',funcionario_id:'employee',receita_id:'recipe',quantidade:6,dias_semana:[2],hora_inicio:'07:30',hora_fim:'12:00',observacoes:'Separar as formas'});
  });
  it('opens editing directly, preserves draft after a failed save, and cancels without another write', async () => {
    mocks.atualizar.mockRejectedValueOnce(new Error('network'));
    renderSchedule('/producao/cronograma/late/editar?dia=3');
    await screen.findByRole('form',{name:'Editar tarefa recorrente'});
    expect(screen.getByLabelText('Início')).toHaveValue('13:00');
    fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Recheios revisados'}});
    await choose('Receita (opcional)','cenoura','Buscar receita');
    fireEvent.change(screen.getByLabelText('Vezes da receita'),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Título da tarefa')).toHaveValue('Recheios revisados');
    expect(screen.getByLabelText('Rendimento previsto')).toHaveValue('36 un');
    expect(mocks.atualizar).toHaveBeenCalledWith(expect.objectContaining({id:'late',dias_semana:[1,3],quantidade:3}));
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    await screen.findByRole('region',{name:'Cronograma de Quarta'});
    expect(mocks.atualizar).toHaveBeenCalledOnce();
    expect(mocks.criar).not.toHaveBeenCalled();
  });
  it('requires valid yield when linked and can remove the link without saving on cancel', async () => {
    renderSchedule('/producao/cronograma/nova?dia=1');
    await screen.findByRole('form',{name:'Nova tarefa recorrente'});
    fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Limpar formas'}});
    await choose('Responsável','Ana','Buscar responsável');
    await choose('Receita (opcional)','Sem rendimento','Buscar receita');
    expect(screen.getByRole('alert')).toHaveTextContent('Cadastre o rendimento');
    expect(screen.getByRole('button',{name:'Criar tarefa'})).toBeDisabled();
    await choose('Receita (opcional)','Sem receita','Buscar receita');
    expect(screen.queryByLabelText('Rendimento previsto')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Criar tarefa'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    await screen.findByRole('region',{name:'Cronograma de Segunda'});
    expect(mocks.criar).not.toHaveBeenCalled();
    expect(mocks.atualizar).not.toHaveBeenCalled();
  });
});
