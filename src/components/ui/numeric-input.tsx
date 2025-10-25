import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumericInputProps extends Omit<React.ComponentProps<"input">, 'type'> {
  onNumericChange?: (value: number) => void;
  allowDecimal?: boolean;
  allowNegative?: boolean;
}

export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ 
    className, 
    onNumericChange, 
    allowDecimal = true, 
    allowNegative = false,
    onWheel,
    onKeyDown,
    ...props 
  }, ref) => {
    
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
    
    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

NumericInput.displayName = 'NumericInput';
