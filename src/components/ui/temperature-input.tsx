import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TemperatureInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TemperatureInput({
  value,
  onChange,
  placeholder = "0",
  disabled = false,
  className,
  id,
}: TemperatureInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      // Quando não está focado, mostra com °C
      setDisplayValue(value !== 0 ? `${value}°C` : '');
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Remove o °C para edição
    setDisplayValue(value !== 0 ? String(value).replace(',', ',') : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    if (displayValue === '' || displayValue === '-') {
      onChange(0);
      setDisplayValue('');
      return;
    }

    // Parse do valor (aceita vírgula como decimal)
    const parsedValue = parseFloat(displayValue.replace(',', '.'));
    
    if (!isNaN(parsedValue)) {
      onChange(parsedValue);
    } else {
      onChange(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permitir apenas números, vírgula, ponto e sinal de menos
    const validPattern = /^-?\d*[,.]?\d*$/;
    
    if (validPattern.test(inputValue) || inputValue === '' || inputValue === '-') {
      setDisplayValue(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir: backspace, delete, tab, escape, enter, ponto, vírgula
    const specialKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', ',', '.', '-'];
    
    if (specialKeys.includes(e.key)) {
      return;
    }
    
    // Permitir: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Bloquear se não for número
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={cn("text-right", className)}
    />
  );
}
