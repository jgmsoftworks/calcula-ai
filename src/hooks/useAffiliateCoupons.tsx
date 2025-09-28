import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function useAffiliateCoupons() {
  const [coupons, setCoupons] = useState<AffiliateCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const getActiveCouponsForAffiliate = (affiliateId: string): AffiliateCoupon[] => {
    return coupons.filter(coupon => 
      coupon.affiliate_id === affiliateId && 
      coupon.is_active && 
      (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
      (!coupon.max_redemptions || coupon.times_redeemed < coupon.max_redemptions)
    );
  };

  const createCoupon = async (couponData: {
    affiliateId: string;
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxRedemptions?: number;
    expiresAt?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-affiliate-coupon', {
        body: couponData
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso",
        description: "Cupom criado com sucesso!"
      });

      loadCoupons();
      return data.coupon;
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar cupom",
        variant: "destructive"
      });
      throw error;
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
      throw error;
    }
  };

  const formatDiscountValue = (type: string, value: number) => {
    if (type === 'percentage') {
      return `${value}% OFF`;
    }
    return `R$ ${value.toFixed(2)} OFF`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  return {
    coupons,
    loading,
    loadCoupons,
    createCoupon,
    toggleCouponStatus,
    getActiveCouponsForAffiliate,
    formatDiscountValue,
    isExpired
  };
}