import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInputPtBr } from "@/components/ui/numeric-input-ptbr";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Percent, DollarSign, Calendar, Users, ToggleLeft, ToggleRight, Trash2, Search, Filter, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliates } from "@/hooks/useAffiliates";

interface AffiliateCoupon {
  id: string;
  affiliate_id: string;
  stripe_coupon_id: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  times_redeemed: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  affiliate?: {
    name: string;
    email: string;
  };
}

export function AffiliateCoupons() {
  const { affiliates } = useAffiliates();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<AffiliateCoupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<AffiliateCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    affiliateId: '',
    name: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 0,
    maxRedemptions: '',
    expiresAt: ''
  });

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_coupons')
        .select(`
          *,
          affiliates!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedCoupons = data.map(coupon => ({
        ...coupon,
        discount_type: coupon.discount_type as 'percentage' | 'fixed',
        affiliate: {
          name: coupon.affiliates.name,
          email: coupon.affiliates.email
        }
      }));

      setCoupons(formattedCoupons);
      setFilteredCoupons(formattedCoupons);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cupons",
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
        coupon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.stripe_coupon_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.affiliate?.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!formData.affiliateId || !formData.name || !formData.discountValue) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
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
      const { data, error } = await supabase.functions.invoke('create-affiliate-coupon', {
        body: {
          affiliateId: formData.affiliateId,
          name: formData.name,
          description: formData.description,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : null,
          expiresAt: formData.expiresAt || null
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: "Cupom criado com sucesso!"
      });

      setIsDialogOpen(false);
      setFormData({
        affiliateId: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: 0,
        maxRedemptions: '',
        expiresAt: ''
      });
      
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

  const toggleCouponStatus = async (couponId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('affiliate_coupons')
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

  const deleteCoupon = async (couponId: string, couponName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cupom "${couponName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('affiliate_coupons')
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

  const duplicateCoupon = async (coupon: AffiliateCoupon) => {
    setFormData({
      affiliateId: coupon.affiliate_id,
      name: `${coupon.name}_COPY`,
      description: coupon.description || '',
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      maxRedemptions: coupon.max_redemptions ? coupon.max_redemptions.toString() : '',
      expiresAt: ''
    });
    setIsDialogOpen(true);
  };

  const formatDiscountValue = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `R$ ${value.toFixed(2)}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading && coupons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cupons de Afiliados</CardTitle>
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
          <CardTitle>Cupons de Afiliados ({filteredCoupons.length})</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Cupom
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Cupom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="affiliate">Afiliado *</Label>
                  <Select value={formData.affiliateId} onValueChange={(value) => setFormData({...formData, affiliateId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um afiliado" />
                    </SelectTrigger>
                    <SelectContent>
                      {affiliates.filter(a => a.status === 'active' && a.id && a.id.trim() !== '').map(affiliate => (
                        <SelectItem key={affiliate.id} value={affiliate.id}>
                          {affiliate.name} ({affiliate.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Nome do Cupom *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: BEMVINDO10, BLACKFRIDAY"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descrição do cupom de desconto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Desconto *</Label>
                    <Select value={formData.discountType} onValueChange={(value: 'percentage' | 'fixed') => setFormData({...formData, discountType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="discountValue">
                      Valor do Desconto * {formData.discountType === 'percentage' ? '(%)' : '(R$)'}
                    </Label>
                    <NumericInputPtBr
                      tipo={formData.discountType === 'percentage' ? 'percentual' : 'valor'}
                      min={0}
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(valor) => setFormData({...formData, discountValue: valor})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxRedemptions">Máximo de Usos</Label>
                    <NumericInputPtBr
                      tipo="quantidade_un"
                      min={1}
                      value={parseInt(formData.maxRedemptions) || 0}
                      onChange={(valor) => setFormData({...formData, maxRedemptions: valor.toString()})}
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
                placeholder="Buscar por nome, código ou afiliado..."
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
            Nenhum cupom criado ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cupom</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Desconto</TableHead>
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
                    <div>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {coupon.stripe_coupon_id}
                      </code>
                      <div className="text-sm text-muted-foreground mt-1">
                        {coupon.name}
                      </div>
                      {coupon.description && (
                        <div className="text-xs text-muted-foreground">
                          {coupon.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{coupon.affiliate?.name}</div>
                      <div className="text-sm text-muted-foreground">{coupon.affiliate?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="h-3 w-3" />
                      ) : (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {formatDiscountValue(coupon.discount_type, coupon.discount_value)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {coupon.times_redeemed}
                      {coupon.max_redemptions && (
                        <span className="text-muted-foreground">/ {coupon.max_redemptions}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.expires_at ? (
                      <div className={`flex items-center gap-1 ${isExpired(coupon.expires_at) ? 'text-red-500' : ''}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem expiração</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      isExpired(coupon.expires_at) ? 'destructive' :
                      coupon.is_active ? 'default' : 'secondary'
                    }>
                      {isExpired(coupon.expires_at) ? 'Expirado' :
                       coupon.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                        disabled={isExpired(coupon.expires_at)}
                        title={coupon.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {coupon.is_active ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => duplicateCoupon(coupon)}
                        title="Duplicar cupom"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteCoupon(coupon.id, coupon.name)}
                        title="Excluir cupom"
                        className="text-red-600 hover:text-red-700"
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