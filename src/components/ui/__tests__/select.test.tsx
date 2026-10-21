import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { NumericInputPtBr } from '../numeric-input-ptbr';

afterEach(cleanup);
const names = ['Bolo gelado', 'Bolo no pote', 'Calda', 'Chantilly', 'Feira', 'Pão de ló', 'Torta'];
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('Feira');
  return <form aria-label="Receita"><Select name="tipo" value={value} onValueChange={setValue} disabled={disabled}>
    <SelectTrigger aria-label="Tipo de produto"><SelectValue /></SelectTrigger>
    <SelectContent>{names.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
  </Select></form>;
}
function open() { fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' }); }

describe('shared searchable select', () => {
  it('filters accents, selects with the keyboard and preserves the form value', async () => {
    render(<Harness />); open();
    const search = await screen.findByRole('textbox', { name: 'Buscar opção' });
    fireEvent.change(search, { target: { value: 'pao' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Pão de ló' })).toBeInTheDocument();
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Pão de ló' }), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Pão de ló'));
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('tipo')).toBe('Pão de ló');
    open();
    expect(await screen.findByRole('textbox', { name: 'Buscar opção' })).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(names.length);
  });
  it('keeps the existing choice when a search has no matches', async () => {
    render(<Harness />); open();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Buscar opção' }), { target: { value: 'inexistente' } });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma opção encontrada');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Feira'));
  });
  it('confirms a search with Enter after an option was hovered', async () => {
    render(<Harness />); open();
    const search = await screen.findByRole('textbox', { name: 'Buscar opção' });
    fireEvent.change(search, { target: { value: 'calda' } });
    fireEvent.pointerMove(screen.getByRole('option', { name: 'Calda' }), { pointerType: 'mouse' });
    fireEvent.focus(search);
    fireEvent.keyDown(search, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Calda'));
  });
  it('does not open a disabled control', () => {
    render(<Harness disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});

it('lets conservation explicitly omit examples without changing stored values', () => {
  const change = vi.fn();
  const { rerender } = render(<NumericInputPtBr aria-label="Tempo" tipo="quantidade_un" value={0} onChange={change} placeholder="" />);
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '');
  rerender(<NumericInputPtBr aria-label="Tempo" tipo="quantidade_un" value={15} onChange={change} placeholder="" />);
  expect(screen.getByRole('textbox')).toHaveValue('15');
  expect(change).not.toHaveBeenCalled();
});
