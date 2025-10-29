import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    commission_type: editingAffiliate?.commission_type || 'percentage' as 'percentage' | 'fixed',
    commission_percentage: editingAffiliate?.commission_percentage || 10,
    commission_fixed_amount: editingAffiliate?.commission_fixed_amount || 0,
    pix_key: editingAffiliate?.pix_key || ''
  });

  // Carregar configurações padrão
  useEffect(() => {
    if (!editingAffiliate) {
      loadDefaultSettings();
    }
  }, []);

  const loadDefaultSettings = async () => {
    try {
      const { data } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('type', 'affiliate_system_settings')
        .maybeSingle();

      if (data?.configuration) {
        const settings = data.configuration as any;
        setFormData(prev => ({
          ...prev,
          commission_type: settings.default_commission_type || 'percentage',
          commission_percentage: settings.default_commission_percentage || 10,
          commission_fixed_amount: settings.default_commission_fixed_amount || 0
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações padrão:', error);
    }
  };

  const validateCPFCNPJ = (document: string) => {
    const cleanDoc = document.replace(/\D/g, '');
    if (cleanDoc.length === 11) {
      // Validação básica de CPF
      return /^\d{11}$/.test(cleanDoc);
    } else if (cleanDoc.length === 14) {
      // Validação básica de CNPJ
      return /^\d{14}$/.test(cleanDoc);
    }
    return false;
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
    } catch (error) {
      return true;
    }
  };

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

    // Validar comissões
    if (formData.commission_type === 'percentage') {
      if (formData.commission_percentage < 1 || formData.commission_percentage > 50) {
        toast({
          title: "Erro",
          description: "Comissão percentual deve estar entre 1% e 50%",
          variant: "destructive"
        });
        return;
      }
      if (formData.commission_percentage < 5) {
        toast({
          title: "Atenção",
          description: "Comissão muito baixa pode desmotivar afiliados (recomendado: mínimo 5%)",
          variant: "default"
        });
      }
    } else {
      if (formData.commission_fixed_amount < 0) {
        toast({
          title: "Erro",
          description: "Valor da comissão não pode ser negativo",
          variant: "destructive"
        });
        return;
      }
      if (formData.commission_fixed_amount === 0) {
        toast({
          title: "Erro",
          description: "Valor da comissão não pode ser zero",
          variant: "destructive"
        });
        return;
      }
    }

    // Validar CPF/CNPJ se informado
    if (formData.document && !validateCPFCNPJ(formData.document)) {
      toast({
        title: "Erro",
        description: "CPF/CNPJ inválido",
        variant: "destructive"
      });
      return;
    }

    // Validar email único
    const emailIsUnique = await validateEmail(formData.email);
    if (!emailIsUnique) {
      toast({
        title: "Erro",
        description: "Este email já está cadastrado",
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
            <NumericInputPtBr
              tipo="percentual"
              min={0}
              max={100}
              value={formData.commission_percentage}
              onChange={(valor) => setFormData({ ...formData, commission_percentage: valor })}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="commission_fixed_amount">Valor Fixo da Comissão (R$)</Label>
            <NumericInputPtBr
              tipo="valor"
              min={0}
              value={formData.commission_fixed_amount}
              onChange={(valor) => setFormData({ ...formData, commission_fixed_amount: valor })}
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