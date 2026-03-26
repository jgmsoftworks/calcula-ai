import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Label } from "@/components/ui/label";
import { useAffiliates } from "@/hooks/useAffiliates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    commission_first_sale_pct: editingAffiliate?.commission_first_sale_pct || 40,
    commission_recurring_pct: editingAffiliate?.commission_recurring_pct || 20,
    support_hourly_rate: editingAffiliate?.support_hourly_rate || 10,
    // Keep legacy fields for compatibility
    commission_type: 'percentage' as const,
    commission_percentage: editingAffiliate?.commission_first_sale_pct || 40,
    commission_fixed_amount: 0,
    pix_key: editingAffiliate?.pix_key || ''
  });

  const validateCPFCNPJ = (document: string) => {
    const cleanDoc = document.replace(/\D/g, '');
    return cleanDoc.length === 11 || cleanDoc.length === 14;
  };

  const validateEmail = async (email: string) => {
    if (!email) return true;
    try {
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('email', email)
        .neq('id', editingAffiliate?.id || '');
      return !data || data.length === 0;
    } catch {
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" });
      return;
    }

    if (formData.commission_first_sale_pct < 1 || formData.commission_first_sale_pct > 100) {
      toast({ title: "Erro", description: "Comissão 1ª venda deve estar entre 1% e 100%", variant: "destructive" });
      return;
    }

    if (formData.commission_recurring_pct < 1 || formData.commission_recurring_pct > 100) {
      toast({ title: "Erro", description: "Comissão recorrente deve estar entre 1% e 100%", variant: "destructive" });
      return;
    }

    if (formData.document && !validateCPFCNPJ(formData.document)) {
      toast({ title: "Erro", description: "CPF/CNPJ inválido", variant: "destructive" });
      return;
    }

    const emailIsUnique = await validateEmail(formData.email);
    if (!emailIsUnique) {
      toast({ title: "Erro", description: "Este email já está cadastrado", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document: formData.document,
        pix_key: formData.pix_key,
        commission_type: 'percentage',
        commission_percentage: formData.commission_first_sale_pct,
        commission_fixed_amount: 0,
        commission_first_sale_pct: formData.commission_first_sale_pct,
        commission_recurring_pct: formData.commission_recurring_pct,
        support_hourly_rate: formData.support_hourly_rate,
      };

      if (editingAffiliate) {
        await updateAffiliate(editingAffiliate.id, payload);
      } else {
        await createAffiliate(payload);
      }
      
      onSuccess?.();
    } catch {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="document">CPF/CNPJ</Label>
          <Input id="document" value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
        </div>
      </div>

      <div>
        <Label htmlFor="pix_key">Chave PIX (para pagamentos)</Label>
        <Input id="pix_key" value={formData.pix_key} onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })} placeholder="CPF, email, telefone ou chave aleatória" />
      </div>

      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
        <h3 className="font-semibold text-sm">Comissões do Vendedor</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>1ª Mensalidade (%)</Label>
            <NumericInputPtBr
              tipo="percentual"
              min={0}
              max={100}
              value={formData.commission_first_sale_pct}
              onChange={(valor) => setFormData({ ...formData, commission_first_sale_pct: valor })}
            />
            <p className="text-xs text-muted-foreground mt-1">Comissão na primeira venda</p>
          </div>
          <div>
            <Label>Recorrente (%)</Label>
            <NumericInputPtBr
              tipo="percentual"
              min={0}
              max={100}
              value={formData.commission_recurring_pct}
              onChange={(valor) => setFormData({ ...formData, commission_recurring_pct: valor })}
            />
            <p className="text-xs text-muted-foreground mt-1">Enquanto o cliente estiver ativo</p>
          </div>
          <div>
            <Label>Valor/hora Suporte (R$)</Label>
            <NumericInputPtBr
              tipo="valor"
              min={0}
              value={formData.support_hourly_rate}
              onChange={(valor) => setFormData({ ...formData, support_hourly_rate: valor })}
            />
            <p className="text-xs text-muted-foreground mt-1">Preço por hora de suporte</p>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (editingAffiliate ? "Salvando..." : "Criando...") : (editingAffiliate ? "Salvar Alterações" : "Criar Vendedor")}
      </Button>
    </form>
  );
}
