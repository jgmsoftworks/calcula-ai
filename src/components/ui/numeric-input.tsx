import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumericInputProps extends Omit<React.ComponentProps<"input">, 'type' | 'value' | 'onChange'> {
  value?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ 
    className, 
    value,
    onChange,
    allowDecimal = true, 
    allowNegative = false,
    onWheel,
    onKeyDown,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    
    // Sincronizar com prop value apenas quando não está focado
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value !== undefined && value !== null ? String(value) : '');
      }
    }, [value, isFocused]);
    
    // Bloquear scroll do mouse
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      e.currentTarget.blur();
      onWheel?.(e);
    };
    
    // Bloquear setas up/down
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
      onKeyDown?.(e);
    };
    
    // Selecionar texto ao focar
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      e.target.select();
      onFocus?.(e);
    };

    // Ao sair do foco, normalizar valor
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Se estiver vazio, mostrar 0
      if (displayValue === '') {
        setDisplayValue('0');
        
        // Disparar onChange com valor 0
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: '0' }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }
      
      onBlur?.(e);
    };
    
    // Controlar mudanças de valor
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Permitir vazio durante digitação
      if (newValue === '') {
        setDisplayValue('');
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: '0' }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
        return;
      }
      
      // Filtrar caracteres inválidos
      if (allowDecimal) {
        newValue = newValue.replace(/[^\d.,-]/g, '');
      } else {
        newValue = newValue.replace(/[^\d-]/g, '');
      }
      
      if (!allowNegative) {
        newValue = newValue.replace(/-/g, '');
      }
      
      setDisplayValue(newValue);
      onChange?.(e);
    };
    
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';
