import * as React from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'min' | 'max'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const format = (value: number) => formatter.format(value).replace(/\u00a0/g, ' ');
const digits = (value: string) => value.replace(/\D/g, '');

// Keep the caret next to the edited digit when the mask inserts separators.
function caretPosition(text: string, digitsToRight: number) {
  if (!digitsToRight) return text.length;
  let remaining = digitsToRight;
  for (let index = text.length - 1; index >= 0; index--) {
    if (/\d/.test(text[index]) && --remaining === 0) {
      while (index > 0 && !/\d/.test(text[index - 1])) index--;
      return index;
    }
  }
  return text.search(/\d/);
}

function pastedAmount(text: string): number | null {
  const clean = text.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!/^\d[\d.,]*$/.test(clean)) return null;
  let normalized: string;
  if (clean.includes(',')) {
    if (!/^\d+(?:\.\d{3})*(?:,\d{0,2})?$/.test(clean)) return null;
    normalized = clean.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(clean)) {
    normalized = clean; // Also accept a decimal copied from a spreadsheet/API.
  } else {
    if (!/^\d+(?:\.\d{3})*$/.test(clean)) return null;
    normalized = clean.replace(/\./g, '');
  }
  const amount = Number(normalized);
  return Number.isSafeInteger(Math.round(amount * 100)) ? amount : null;
}

/** Monetary keyboard: digits fill cents; pasted amounts retain their monetary value. */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, min, max, className, onFocus, onClick, onBlur, onPaste, onKeyDown, onWheel, placeholder = 'R$ 0,00', ...props }, forwardedRef) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    // A fresh state object also restores the caret when only a separator was deleted.
    const [{ text }, setDisplay] = React.useState(() => ({ text: safeValue === 0 ? '' : format(safeValue) }));
    const setText = (nextText: string) => setDisplay({ text: nextText });
    const inputRef = React.useRef<HTMLInputElement>(null);
    const lastValue = React.useRef(safeValue);
    const caret = React.useRef<number | null>(null);
    const { toast } = useToast();
    React.useImperativeHandle(forwardedRef, () => inputRef.current!);

    React.useEffect(() => {
      if (safeValue !== lastValue.current) {
        lastValue.current = safeValue;
        setText(safeValue === 0 ? '' : format(safeValue));
      }
    }, [safeValue]);
    React.useLayoutEffect(() => {
      if (caret.current !== null) {
        inputRef.current?.setSelectionRange(caret.current, caret.current);
        caret.current = null;
      }
    });

    const update = (amount: number, nextText: string, position: number) => {
      lastValue.current = amount;
      caret.current = position;
      setText(nextText);
      onChange(amount);
    };

    return <Input {...props} ref={inputRef} type="text" inputMode="decimal" autoComplete={props.autoComplete ?? 'off'}
      value={text} placeholder={placeholder} className={cn('tabular-nums', className)}
      onChange={event => {
        const raw = event.currentTarget.value;
        const rawDigits = digits(raw);
        if (!Number.isSafeInteger(Number(rawDigits))) return;
        const amount = Number(rawDigits) / 100;
        const nextText = rawDigits ? format(amount) : '';
        const right = digits(raw.slice(event.currentTarget.selectionStart ?? raw.length)).length;
        update(amount, nextText, Math.max(0, caretPosition(nextText, right)));
      }}
      onFocus={event => { event.currentTarget.select(); onFocus?.(event); }}
      onClick={event => { event.currentTarget.select(); onClick?.(event); }}
      onPaste={event => {
        onPaste?.(event);
        if (event.defaultPrevented || props.readOnly || props.disabled) return;
        event.preventDefault();
        const amount = pastedAmount(event.clipboardData.getData('text'));
        if (amount === null) return;
        const nextText = format(amount);
        update(amount, nextText, nextText.length);
      }}
      onBlur={event => {
        const amount = lastValue.current;
        const bounded = min !== undefined && amount < min ? min : max !== undefined && amount > max ? max : amount;
        if (bounded !== amount) {
          toast({ title: amount < bounded ? 'Valor abaixo do mínimo' : 'Valor acima do máximo', description: `O limite é ${format(bounded)}.`, variant: 'destructive' });
          lastValue.current = bounded;
          setText(format(bounded));
          onChange(bounded);
        }
        onBlur?.(event);
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') event.preventDefault();
        onKeyDown?.(event);
        if (event.defaultPrevented || props.readOnly || event.key !== 'Delete') return;
        const start = event.currentTarget.selectionStart;
        if (start === null || start !== event.currentTarget.selectionEnd || /\d/.test(text[start] || '')) return;
        let nextDigit = start;
        while (nextDigit < text.length && !/\d/.test(text[nextDigit])) nextDigit++;
        if (nextDigit === text.length) return;
        event.preventDefault();
        const rawDigits = digits(text.slice(0, nextDigit) + text.slice(nextDigit + 1));
        const amount = Number(rawDigits) / 100;
        const nextText = rawDigits ? format(amount) : '';
        update(amount, nextText, Math.max(0, caretPosition(nextText, digits(text.slice(nextDigit + 1)).length)));
      }}
      onWheel={event => { event.currentTarget.blur(); onWheel?.(event); }}
    />;
  }
);
CurrencyInput.displayName = 'CurrencyInput';
