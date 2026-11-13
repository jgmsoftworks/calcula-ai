import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConcluirProducaoModal } from '../ConcluirProducaoModal';
import { ReceitaProducaoFields } from '../ReceitaProducaoFields';
import { totaisRendimento } from '@/lib/totaisRendimento';
import { rendimentoDaTarefa } from '@/lib/producaoRendimento';
const receita={id:'recipe',nome:'Massa de cenoura',imagem_url:null,rendimento_valor:12,rendimento_unidade:'un'};
const tarefa={titulo:'Assar bolos',receita_id:'recipe',receita,rendimento_previsto:72,rendimento_unidade:'un',status:'em_producao'};
afterEach(cleanup);
describe('Production yield',()=>{
  it('shows recipe yield multiplied by the number of batches',()=>{
    render(<ReceitaProducaoFields receitas={[receita]} receitaId="recipe" quantidade={6} onRecipeChange={()=>{}} onQuantityChange={()=>{}} />);
    expect(screen.getByLabelText('Rendimento previsto')).toHaveValue('72 un');
  });
  it('requires an explicit actual quantity and accepts zero without substituting the expected yield',async()=>{
    const confirm=vi.fn().mockResolvedValue(undefined),close=vi.fn();
    render(<ConcluirProducaoModal tarefa={tarefa} onClose={close} onConfirm={confirm} />);
    expect(screen.getByLabelText('Quanto rendeu? (un)')).toHaveValue('');
    expect(screen.getByRole('button',{name:'Finalizar produção'})).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Quanto rendeu? (un)'),{target:{value:'0'}});
    fireEvent.click(screen.getByRole('button',{name:'Finalizar produção'}));
    await waitFor(()=>expect(confirm).toHaveBeenCalledWith(0));expect(close).toHaveBeenCalledOnce();
  });
  it('cancels without sending a completion and keeps the value if saving fails',async()=>{
    const confirm=vi.fn().mockRejectedValue(new Error('Falha ao salvar')),close=vi.fn();
    render(<ConcluirProducaoModal tarefa={tarefa} onClose={close} onConfirm={confirm} />);
    fireEvent.change(screen.getByLabelText('Quanto rendeu? (un)'),{target:{value:'70,5'}});
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Finalizar produção'}));await screen.findByRole('alert');
    expect(screen.getByLabelText('Quanto rendeu? (un)')).toHaveValue('70,5');
  });
  it('keeps unit totals separate and excludes missing data and reopened tasks',()=>{
    const base={id:'1',titulo:'Produção',data_producao:'2026-11-11',status:'feito'};
    expect(totaisRendimento([
      {...base,rendimento_previsto:72,rendimento_real:70,rendimento_unidade:'un'},
      {...base,id:'2',rendimento_previsto:10,rendimento_real:0,rendimento_unidade:'un'},
      {...base,id:'3',rendimento_previsto:5,rendimento_real:4.5,rendimento_unidade:'kg'},
      {...base,id:'4',rendimento_previsto:20,rendimento_real:null,rendimento_unidade:'un'},
      {...base,id:'5',status:'em_producao',rendimento_previsto:10,rendimento_real:9,rendimento_unidade:'un'},
    ])).toEqual([{unidade:'un',previsto:82,real:70,producoes:2},{unidade:'kg',previsto:5,real:4.5,producoes:1}]);
    expect(rendimentoDaTarefa({receita,quantidade:6,status:'feito'}).previsto).toBeNull();
    expect(rendimentoDaTarefa({...tarefa,receita:{...receita,rendimento_valor:20}}).previsto).toBe(72);
  });
});
