import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface ColunaConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

interface ListaConfiguracoesProps {
  colunas: ColunaConfig[];
  onColunasChange: (colunas: ColunaConfig[]) => void;
  itensPorPagina: number;
  onItensPorPaginaChange: (items: number) => void;
}

export const ListaConfiguracoes = ({
  colunas,
  onColunasChange,
  itensPorPagina,
  onItensPorPaginaChange
}: ListaConfiguracoesProps) => {
  const [open, setOpen] = useState(false);

  const toggleVisibilidade = (key: string) => {
    const novasColunas = colunas.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    onColunasChange(novasColunas);
  };

  const moveColuna = (key: string, direction: 'up' | 'down') => {
    const currentIndex = colunas.findIndex(col => col.key === key);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= colunas.length) return;

    const novasColunas = [...colunas];
    const [movedItem] = novasColunas.splice(currentIndex, 1);
    novasColunas.splice(newIndex, 0, movedItem);

    // Atualizar orders
    novasColunas.forEach((col, index) => {
      col.order = index;
    });

    onColunasChange(novasColunas);
  };

  const colunasOrdenadas = [...colunas].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary">Configurações da Lista</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Itens por página */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Itens por página</Label>
            <Select value={itensPorPagina.toString()} onValueChange={(value) => onItensPorPaginaChange(Number(value))}>
              <SelectTrigger className="border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 itens</SelectItem>
                <SelectItem value="25">25 itens</SelectItem>
                <SelectItem value="50">50 itens</SelectItem>
                <SelectItem value="100">100 itens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colunas visíveis */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Colunas e Ordem</Label>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {colunasOrdenadas.map((coluna, index) => (
                <div key={coluna.key} className="flex items-center justify-between p-2 border border-primary/20 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Switch
                      id={coluna.key}
                      checked={coluna.visible}
                      onCheckedChange={() => toggleVisibilidade(coluna.key)}
                    />
                    <Label htmlFor={coluna.key} className="text-sm">
                      {coluna.label}
                    </Label>
                    {coluna.visible && (
                      <Badge variant="secondary" className="text-xs">
                        {index + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveColuna(coluna.key, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveColuna(coluna.key, 'down')}
                      disabled={index === colunas.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};