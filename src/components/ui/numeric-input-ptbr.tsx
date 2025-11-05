import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface NumericInputPtBrProps extends Omit<React.ComponentProps<"input">, 'type' | 'onChange' | 'value'> {
  tipo: 'valor' | 'percentual' | 'quantidade_un' | 'quantidade_continua';
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  onBlur?: () => void;
}

export const NumericInputPtBr = React.forwardRef<HTMLInputElement, NumericInputPtBrProps>(
  ({ 
    tipo,
    value,
    onChange,
    className, 
    min,
    max,
    placeholder,
    disabled,
    onBlur,
    ...props 
  }, ref) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const { toast } = useToast();
    
    // Formatar para exibição baseado no tipo
    const formatForDisplay = (num: number): string => {
      if (isNaN(num)) return '';
      if (num === 0 && !isFocused) return '';
      
      switch (tipo) {
        case 'valor':
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(num);
        case 'percentual':
          return `${new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(num)}%`;
        case 'quantidade_un':
          return new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 0
          }).format(num);
        case 'quantidade_continua':
          return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3
          }).format(num);
        default:
          return String(num);
      }
    };

    // Parse entrada para número
    const parseInput = (input: string): number => {
      if (!input || input === '') return 0;
      // Remove tudo exceto dígitos e vírgula
      const cleaned = input.replace(/[^\d,]/g, '');
      // Substitui vírgula por ponto para parsing
      const normalized = cleaned.replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Atualizar display quando value mudar de fora
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatForDisplay(value));
      }
    }, [value, isFocused, tipo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Durante digitação: permitir apenas dígitos e vírgula
      const filtered = inputValue.replace(/[^\d,]/g, '');
      
      // Validar quantidade de vírgulas
      const commaCount = (filtered.match(/,/g) || []).length;
      if (commaCount > 1) return;
      
      // Para quantidade_un, bloquear vírgula
      if (tipo === 'quantidade_un' && filtered.includes(',')) {
        toast({
          title: "Apenas números inteiros",
          description: "Este campo não aceita decimais",
          variant: "destructive"
        });
        return;
      }
      
      setDisplayValue(filtered);
      
      // Callback com valor numérico (sempre válido)
      const numericValue = parseInput(filtered);
      if (!isNaN(numericValue) && isFinite(numericValue)) {
        onChange(numericValue);
      } else {
        onChange(0); // Fallback seguro
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
      // Ao focar, mostrar apenas os dígitos + vírgula (sem formatação)
      if (value === 0) {
        setDisplayValue('');
      } else {
        // Mostrar valor sem formatação de milhares
        const unformatted = String(value).replace('.', ',');
        setDisplayValue(unformatted);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      const num = parseInput(displayValue);
      
      // Validação de limites
      if (min !== undefined && num < min) {
        toast({
          title: "Valor abaixo do mínimo",
          description: `O valor mínimo é ${formatForDisplay(min)}`,
          variant: "destructive"
        });
        onChange(min);
        setDisplayValue(formatForDisplay(min));
        onBlur?.();
        return;
      }
      
      if (max !== undefined && num > max) {
        toast({
          title: "Valor acima do máximo",
          description: `O valor máximo é ${formatForDisplay(max)}`,
          variant: "destructive"
        });
        onChange(max);
        setDisplayValue(formatForDisplay(max));
        onBlur?.();
        return;
      }
      
      // Aplicar formatação completa
      setDisplayValue(formatForDisplay(num));
      onBlur?.();
    };

    const getPlaceholder = () => {
      if (placeholder) return placeholder;
      
      switch (tipo) {
        case 'valor': return 'R$ 0,00';
        case 'percentual': return '0,00%';
        case 'quantidade_un': return '0';
        case 'quantidade_continua': return '0,000';
        default: return '';
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={getPlaceholder()}
        disabled={disabled}
        className={cn(
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        onWheel={(e) => e.currentTarget.blur()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
          }
        }}
        {...props}
      />
    );
  }
);

NumericInputPtBr.displayName = 'NumericInputPtBr';
