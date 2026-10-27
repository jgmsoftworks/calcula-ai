import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NumericInputPtBr } from '../numeric-input-ptbr';
import { setBusinessRegion } from '@/lib/business-region';

afterEach(() => { cleanup(); setBusinessRegion('BR'); });
function Harness({ initial = 45, min, max, readOnly = false }: { initial?: number; min?: number; max?: number; readOnly?: boolean }) {
  const [value, setValue] = useState(initial);
  return <><NumericInputPtBr aria-label="Valor" tipo="valor" value={value} onChange={setValue} min={min} max={max} readOnly={readOnly} /><output>{value}</output></>;
}
const input = () => screen.getByRole('textbox', { name: 'Valor' }) as HTMLInputElement;
const paste = (text: string) => fireEvent.paste(input(), { clipboardData: { getData: () => text } });

describe('monetary fields', () => {
  it('edits euro cents and accepts Portuguese grouping without converting the amount', () => {
    setBusinessRegion('PT'); render(<Harness initial={0} />);
    fireEvent.change(input(), { target: { value: '1234567' } });
    expect(input()).toHaveValue('12 345,67 €');
    expect(screen.getByRole('status')).toHaveTextContent('12345.67');
    paste('25\u00a0000,50 €');
    expect(input()).toHaveValue('25 000,50 €');
    expect(screen.getByRole('status')).toHaveTextContent('25000.5');
    paste('R$ 99,00');
    expect(input()).toHaveValue('25 000,50 €');
  });
  it('keeps currency formatting on focus and selects the entire value on every click', () => {
    render(<Harness />);
    fireEvent.focus(input());
    expect(input()).toHaveValue('R$ 45,00');
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(input().value.length);
    input().setSelectionRange(3, 3);
    fireEvent.click(input());
    expect(input().selectionStart).toBe(0);
    expect(input().selectionEnd).toBe(input().value.length);
  });

  it('masks cents and thousands immediately and returns a numeric value', () => {
    render(<Harness initial={0} />);
    fireEvent.focus(input());
    for (const [raw, expected, numeric] of [['3', 'R$ 0,03', '0.03'], ['R$ 0,030', 'R$ 0,30', '0.3'], ['30000000', 'R$ 300.000,00', '300000']]) {
      fireEvent.change(input(), { target: { value: raw } });
      expect(input()).toHaveValue(expected);
      expect(screen.getByRole('status')).toHaveTextContent(numeric);
    }
    fireEvent.blur(input());
    expect(input()).toHaveValue('R$ 300.000,00');
  });

  it.each([['R$ 300.000,50', 'R$ 300.000,50', '300000.5'], ['300000', 'R$ 300.000,00', '300000'], ['45,50', 'R$ 45,50', '45.5'], ['45.50', 'R$ 45,50', '45.5'], ['1.234', 'R$ 1.234,00', '1234']])('pastes %s without changing its monetary meaning', (text, formatted, numeric) => {
    render(<Harness />); paste(text);
    expect(input()).toHaveValue(formatted);
    expect(screen.getByRole('status')).toHaveTextContent(numeric);
  });

  it('keeps the caret at a deleted separator instead of jumping to the end', () => {
    render(<Harness initial={9234.56} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: 'R$ 9234,56', selectionStart: 4, selectionEnd: 4 } });
    expect(input()).toHaveValue('R$ 9.234,56');
    expect(input().selectionStart).toBe(4);
    fireEvent.change(input(), { target: { value: 'R$ .234,56', selectionStart: 3, selectionEnd: 3 } });
    expect(input()).toHaveValue('R$ 234,56');
  });

  it('lets Delete skip a separator and remove the next digit', () => {
    render(<Harness initial={1234.56} />);
    fireEvent.focus(input());
    input().setSelectionRange(4, 4);
    fireEvent.keyDown(input(), { key: 'Delete' });
    expect(input()).toHaveValue('R$ 134,56');
    expect(screen.getByRole('status')).toHaveTextContent('134.56');
  });

  it('clears to zero, accepts decimal edits and validates limits on blur', () => {
    render(<Harness min={0} max={100} />);
    fireEvent.change(input(), { target: { value: '' } });
    expect(input()).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('0');
    paste('100,01');
    fireEvent.blur(input());
    expect(input()).toHaveValue('R$ 100,00');
    expect(screen.getByRole('status')).toHaveTextContent('100');
  });

  it('preserves stored precision when focusing and blurring without edits', () => {
    const change = vi.fn();
    const { rerender } = render(<NumericInputPtBr tipo="valor" value={0.045} onChange={change} aria-label="Valor" />);
    fireEvent.focus(input()); fireEvent.blur(input());
    expect(change).not.toHaveBeenCalled();
    rerender(<NumericInputPtBr tipo="valor" value={1234.5} onChange={change} aria-label="Valor" />);
    expect(input()).toHaveValue('R$ 1.234,50');
  });

  it('rejects malformed pastes and keeps read-only monetary values unchanged', () => {
    render(<Harness />); paste('12,34,56'); paste('-50,00');
    expect(input()).toHaveValue('R$ 45,00');
    cleanup(); render(<Harness readOnly />); paste('100,00');
    expect(input()).toHaveValue('R$ 45,00');
  });
});
