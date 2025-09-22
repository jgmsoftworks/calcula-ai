import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoadmap, RoadmapItem } from "@/hooks/useRoadmap";
import { Loader2 } from "lucide-react";

interface RoadmapItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: RoadmapItem | null;
}

export const RoadmapItemModal: React.FC<RoadmapItemModalProps> = ({
  open,
  onOpenChange,
  item,
}) => {
  const { createRoadmapItem, updateRoadmapItem } = useRoadmap();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "planned" as "planned" | "in_progress" | "released",
    eta: "",
  });

  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description,
        status: item.status,
        eta: item.eta || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: "planned",
        eta: "",
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        ...formData,
        eta: formData.eta || undefined,
      };

      let result;
      if (isEditing) {
        result = await updateRoadmapItem(item.id, submitData);
      } else {
        result = await createRoadmapItem(submitData);
      }

      if (result.success) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: "planned", label: "Planejado" },
    { value: "in_progress", label: "Em Progresso" },
    { value: "released", label: "Lançado" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Item do Roadmap" : "Criar Item do Roadmap"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Faça as alterações necessárias no item do roadmap."
                : "Adicione um novo item ao roadmap do sistema."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Implementar autenticação via Google"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva detalhadamente o que será implementado..."
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "planned" | "in_progress" | "released") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="eta">ETA (Opcional)</Label>
                <Input
                  id="eta"
                  value={formData.eta}
                  onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                  placeholder="Ex: Q1 2024, Janeiro"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? "Salvando..." : "Criando..."}
                </>
              ) : (
                isEditing ? "Salvar Alterações" : "Criar Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};