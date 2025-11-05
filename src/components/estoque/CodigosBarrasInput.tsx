import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CodigosBarrasInputProps {
  value: string[];
  onChange: (codigos: string[]) => void;
}

export function CodigosBarrasInput({ value, onChange }: CodigosBarrasInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const codigo = inputValue.trim();
    if (!codigo) return;

    if (value.includes(codigo)) {
      return;
    }

    onChange([...value, codigo]);
    setInputValue('');
  };

  const handleRemove = (codigo: string) => {
    onChange(value.filter(c => c !== codigo));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Digite o código de barras e pressione Enter"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" size="icon" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((codigo) => (
            <Badge key={codigo} variant="secondary" className="gap-1">
              {codigo}
              <button
                type="button"
                onClick={() => handleRemove(codigo)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
