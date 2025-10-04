import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Percent, DollarSign, Calendar, Users, ToggleLeft, ToggleRight, Trash2, Search, Filter, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PromotionalCoupon {
  id: string;
  code: string;
  discount_type: 'trial_period' | 'percentage' | 'fixed';
  trial_days: number | null;
  discount_value: number | null;
  max_redemptions: number | null;
  times_redeemed: number;
  applies_to_plans: string[];
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
}

export function PromotionalCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<PromotionalCoupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<PromotionalCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'trial_period' as 'trial_period' | 'percentage' | 'fixed',
    trialDays: 30,
    discountValue: 0,
    maxRedemptions: '',
    expiresAt: '',
    appliesToPlans: ['professional'] as string[]
  });

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('promotional_coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoupons(data || []);
      setFilteredCoupons(data || []);
    } catch (error) {
      console.error('Erro ao carregar cupons promocionais:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cupons promocionais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    let filtered = coupons;
    
    if (searchTerm) {
      filtered = filtered.filter(coupon => 
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(coupon => {
        const expired = isExpired(coupon.expires_at);
        switch (statusFilter) {
          case 'active': return coupon.is_active && !expired;
          case 'inactive': return !coupon.is_active;
          case 'expired': return expired;
          default: return true;
        }
      });
    }
    
    setFilteredCoupons(filtered);
  }, [coupons, searchTerm, statusFilter]);

  const handleCreateCoupon = async () => {
    if (!formData.code) {
      toast({
        title: "Erro",
        description: "Código do cupom é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (formData.discountType === 'trial_period' && (!formData.trialDays || formData.trialDays < 1)) {
      toast({
        title: "Erro",
        description: "Período de teste deve ser maior que 0 dias",
        variant: "destructive"
      });
      return;
    }

    if (formData.discountType === 'percentage' && (formData.discountValue < 1 || formData.discountValue > 100)) {
      toast({
        title: "Erro",
        description: "Percentual deve estar entre 1% e 100%",
        variant: "destructive"
      });
      return;
    }

    if (formData.discountType === 'fixed' && formData.discountValue < 1) {
      toast({
        title: "Erro",
        description: "Valor do desconto deve ser maior que R$ 1,00",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('promotional_coupons')
        .insert({
          code: formData.code.trim().toUpperCase(),
          discount_type: formData.discountType,
          trial_days: formData.discountType === 'trial_period' ? formData.trialDays : null,
          discount_value: formData.discountType !== 'trial_period' ? formData.discountValue : null,
          max_redemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
          expires_at: formData.expiresAt || null,
          applies_to_plans: formData.appliesToPlans,
          is_active: true,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cupom promocional criado com sucesso!"
      });

      setIsDialogOpen(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar cupom",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'trial_period',
      trialDays: 30,
      discountValue: 0,
      maxRedemptions: '',
      expiresAt: '',
      appliesToPlans: ['professional']
    });
  };

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('promotional_coupons')
        .update({ is_active: !currentStatus })
        .eq('id', couponId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Cupom ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`
      });

      loadCoupons();
    } catch (error) {
      console.error('Erro ao alterar status do cupom:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do cupom",
        variant: "destructive"
      });
    }
  };

  const deleteCoupon = async (couponId: string, couponCode: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom "${couponCode}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promotional_coupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cupom excluído com sucesso"
      });

      loadCoupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cupom",
        variant: "destructive"
      });
    }
  };

  const formatDiscountValue = (coupon: PromotionalCoupon) => {
    if (coupon.discount_type === 'trial_period') {
      return `${coupon.trial_days} dias grátis`;
    }
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value?.toFixed(2)} OFF`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handlePlanToggle = (plan: string) => {
    setFormData(prev => ({
      ...prev,
      appliesToPlans: prev.appliesToPlans.includes(plan)
        ? prev.appliesToPlans.filter(p => p !== plan)
        : [...prev.appliesToPlans, plan]
    }));
  };

  if (loading && coupons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cupons Promocionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cupons Promocionais ({filteredCoupons.length})</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Crie cupons de teste, períodos gratuitos e descontos especiais
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Cupom Promocional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Código do Cupom *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                    placeholder="Ex: TESTE30DIAS, BEMVINDO"
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Será convertido automaticamente para maiúsculas
                  </p>
                </div>

                <div>
                  <Label>Tipo de Cupom *</Label>
                  <Select 
                    value={formData.discountType} 
                    onValueChange={(value: 'trial_period' | 'percentage' | 'fixed') => 
                      setFormData({...formData, discountType: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial_period">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4" />
                          Período de Teste Grátis
                        </div>
                      </SelectItem>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Desconto Percentual (%)
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Desconto Fixo (R$)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.discountType === 'trial_period' ? (
                  <div>
                    <Label htmlFor="trialDays">Dias de Teste Grátis *</Label>
                    <Input
                      id="trialDays"
                      type="number"
                      min="1"
                      value={formData.trialDays}
                      onChange={(e) => setFormData({...formData, trialDays: parseInt(e.target.value) || 0})}
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="discountValue">
                      Valor do Desconto * {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      min="0"
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      step={formData.discountType === 'percentage' ? 1 : 0.01}
                      value={formData.discountValue || ''}
                      onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                )}

                <div>
                  <Label className="mb-3 block">Aplicável aos Planos *</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="plan-professional"
                        checked={formData.appliesToPlans.includes('professional')}
                        onCheckedChange={() => handlePlanToggle('professional')}
                      />
                      <label htmlFor="plan-professional" className="text-sm cursor-pointer">
                        Professional
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="plan-enterprise"
                        checked={formData.appliesToPlans.includes('enterprise')}
                        onCheckedChange={() => handlePlanToggle('enterprise')}
                      />
                      <label htmlFor="plan-enterprise" className="text-sm cursor-pointer">
                        Enterprise
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRedemptions">Máximo de Usos</Label>
                    <Input
                      id="maxRedemptions"
                      type="number"
                      min="1"
                      value={formData.maxRedemptions}
                      onChange={(e) => setFormData({...formData, maxRedemptions: e.target.value})}
                      placeholder="Deixe vazio para ilimitado"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiresAt">Data de Expiração</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateCoupon} disabled={loading} className="flex-1">
                    {loading ? "Criando..." : "Criar Cupom"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredCoupons.length === 0 && coupons.length > 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cupom encontrado com os filtros aplicados.
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cupom promocional criado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Benefício</TableHead>
                <TableHead>Planos</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono font-bold">
                      {coupon.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.discount_type === 'trial_period' ? 'default' : 'secondary'}>
                      {formatDiscountValue(coupon)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {coupon.applies_to_plans.map(plan => (
                        <Badge key={plan} variant="outline" className="text-xs">
                          {plan}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {coupon.times_redeemed}
                      {coupon.max_redemptions && (
                        <span className="text-muted-foreground">/ {coupon.max_redemptions}</span>
                      )}
                      {!coupon.max_redemptions && (
                        <span className="text-muted-foreground">/ ∞</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem expiração</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isExpired(coupon.expires_at) ? (
                      <Badge variant="destructive">Expirado</Badge>
                    ) : coupon.is_active ? (
                      <Badge variant="default">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                      >
                        {coupon.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCoupon(coupon.id, coupon.code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}