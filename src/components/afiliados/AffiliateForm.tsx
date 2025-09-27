import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAffiliates } from "@/hooks/useAffiliates";
import { useToast } from "@/hooks/use-toast";

interface AffiliateFormProps {
  editingAffiliate?: any;
  onSuccess?: () => void;
}

export function AffiliateForm({ editingAffiliate, onSuccess }: AffiliateFormProps) {
  const { createAffiliate, updateAffiliate } = useAffiliates();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingAffiliate?.name || '',
    email: editingAffiliate?.email || '',
    phone: editingAffiliate?.phone || '',
    document: editingAffiliate?.document || '',
    commission_type: editingAffiliate?.commission_type || 'percentage' as 'percentage' | 'fixed',
    commission_percentage: editingAffiliate?.commission_percentage || 10,
    commission_fixed_amount: editingAffiliate?.commission_fixed_amount || 0,
    pix_key: editingAffiliate?.pix_key || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Erro",
        description: "Nome e email são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      if (editingAffiliate) {
        await updateAffiliate(editingAffiliate.id, formData);
      } else {
        await createAffiliate(formData);
      }
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        document: '',
        commission_type: 'percentage',
        commission_percentage: 10,
        commission_fixed_amount: 0,
        pix_key: ''
      });
      onSuccess?.();
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="document">CPF/CNPJ</Label>
          <Input
            id="document"
            value={formData.document}
            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pix_key">Chave PIX (para pagamentos)</Label>
        <Input
          id="pix_key"
          value={formData.pix_key}
          onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
          placeholder="CPF, email, telefone ou chave aleatória"
        />
      </div>

      <div className="space-y-3">
        <Label>Tipo de Comissão</Label>
        <Select 
          value={formData.commission_type} 
          onValueChange={(value: 'percentage' | 'fixed') => setFormData({ ...formData, commission_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentual</SelectItem>
            <SelectItem value="fixed">Valor Fixo</SelectItem>
          </SelectContent>
        </Select>

        {formData.commission_type === 'percentage' ? (
          <div>
            <Label htmlFor="commission_percentage">Percentual de Comissão (%)</Label>
            <Input
              id="commission_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.commission_percentage}
              onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="commission_fixed_amount">Valor Fixo da Comissão (R$)</Label>
            <Input
              id="commission_fixed_amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.commission_fixed_amount}
              onChange={(e) => setFormData({ ...formData, commission_fixed_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (editingAffiliate ? "Salvando..." : "Criando...") : (editingAffiliate ? "Salvar Alterações" : "Criar Afiliado")}
      </Button>
    </form>
  );
}