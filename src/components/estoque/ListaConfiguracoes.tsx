import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

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
    const coluna = colunas.find(col => col.key === key);
    if (!coluna) return;

    // Se está tentando ativar uma coluna, verificar se já tem 4 ativas
    if (!coluna.visible) {
      const colunasVisiveis = colunas.filter(col => col.visible).length;
      if (colunasVisiveis >= 4) {
        return; // Não permite ativar mais de 4 colunas
      }
    }

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

          {/* Colunas Visíveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-primary">Colunas Visíveis</Label>
              <Badge variant="outline" className="text-sm px-3 py-1 border-primary/30 text-primary">
                {colunas.filter(col => col.visible).length}/4 selecionadas
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
              {colunasOrdenadas.map((coluna, index) => (
                <Card key={coluna.key} className={`relative overflow-hidden transition-all duration-200 ${coluna.visible ? 'ring-2 ring-primary/30 bg-primary/5' : 'bg-muted/20'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <Switch
                            id={coluna.key}
                            checked={coluna.visible}
                            onCheckedChange={() => toggleVisibilidade(coluna.key)}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {coluna.visible ? (
                            <Eye className="w-4 h-4 text-primary" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                          <Label htmlFor={coluna.key} className={`text-sm font-medium cursor-pointer ${coluna.visible ? 'text-primary' : 'text-muted-foreground'}`}>
                            {coluna.label}
                          </Label>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {coluna.visible && (
                          <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/10 text-primary border border-primary/30">
                            #{colunas.filter(col => col.visible && col.order <= coluna.order).length}
                          </Badge>
                        )}
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveColuna(coluna.key, 'up')}
                            disabled={index === 0}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveColuna(coluna.key, 'down')}
                            disabled={index === colunas.length - 1}
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground text-center p-2 bg-muted/30 rounded-lg">
              💡 Arraste para reordenar • Máximo de 4 colunas ativas
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};