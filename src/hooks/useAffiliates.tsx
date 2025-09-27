import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  status: string;
  commission_percentage: number;
  commission_type: string;
  commission_fixed_amount?: number;
  pix_key?: string;
  bank_details?: any;
  total_sales: number;
  total_commissions: number;
  total_customers: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface AffiliateLink {
  id: string;
  affiliate_id: string;
  link_code: string;
  product_type: string;
  is_active: boolean;
  clicks_count: number;
  conversions_count: number;
  created_at: string;
  updated_at: string;
  affiliate?: Affiliate;
}

interface AffiliateSale {
  id: string;
  affiliate_id: string;
  affiliate_link_id?: string;
  customer_user_id?: string;
  customer_email: string;
  customer_name?: string;
  plan_type: string;
  sale_amount: number;
  commission_amount: number;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  status: string;
  sale_date: string;
  confirmed_at?: string;
  created_at: string;
  affiliate?: Affiliate;
  affiliate_link?: AffiliateLink;
}

interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  sale_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  payment_details?: any;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  affiliate?: Affiliate;
  sale?: AffiliateSale;
}

interface AffiliatesStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalLinks: number;
  totalSales: number;
  totalSalesCount: number;
  totalCommissions: number;
}

export const useAffiliates = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [affiliateSales, setAffiliateSales] = useState<AffiliateSale[]>([]);
  const [affiliateCommissions, setAffiliateCommissions] = useState<AffiliateCommission[]>([]);
  const [affiliatesStats, setAffiliatesStats] = useState<AffiliatesStats>({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalLinks: 0,
    totalSales: 0,
    totalSalesCount: 0,
    totalCommissions: 0
  });
  const [loading, setLoading] = useState(true);

  // Carregar afiliados
  const loadAffiliates = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliates(data || []);
    } catch (error) {
      console.error('Erro ao carregar afiliados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar afiliados",
        variant: "destructive"
      });
    }
  };

  // Carregar links de afiliados
  const loadAffiliateLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select(`
          *,
          affiliate:affiliates(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliateLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar links de afiliados",
        variant: "destructive"
      });
    }
  };

  // Carregar vendas de afiliados
  const loadAffiliateSales = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_sales')
        .select(`
          *,
          affiliate:affiliates(*),
          affiliate_link:affiliate_links(*)
        `)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      setAffiliateSales(data || []);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas de afiliados",
        variant: "destructive"
      });
    }
  };

  // Carregar comissões
  const loadAffiliateCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          affiliate:affiliates(*),
          sale:affiliate_sales(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliateCommissions(data || []);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar comissões",
        variant: "destructive"
      });
    }
  };

  // Calcular estatísticas
  const calculateStats = () => {
    const stats = {
      totalAffiliates: affiliates.length,
      activeAffiliates: affiliates.filter(a => a.status === 'active').length,
      totalLinks: affiliateLinks.filter(l => l.is_active).length,
      totalSales: affiliateSales
        .filter(s => s.status === 'confirmed')
        .reduce((sum, s) => sum + s.sale_amount, 0),
      totalSalesCount: affiliateSales.filter(s => s.status === 'confirmed').length,
      totalCommissions: affiliateCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)
    };
    setAffiliatesStats(stats);
  };

  // Criar afiliado
  const createAffiliate = async (affiliateData: {
    name: string;
    email: string;
    phone?: string;
    document?: string;
    commission_percentage?: number;
    commission_type?: string;
    commission_fixed_amount?: number;
    pix_key?: string;
    bank_details?: any;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('affiliates')
        .insert([{
          ...affiliateData,
          user_id: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await loadAffiliates();
      
      toast({
        title: "Sucesso",
        description: "Afiliado criado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar afiliado:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar afiliado",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Atualizar afiliado
  const updateAffiliate = async (id: string, updates: Partial<Affiliate>) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await loadAffiliates();
      
      toast({
        title: "Sucesso",
        description: "Afiliado atualizado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao atualizar afiliado:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar afiliado",
        variant: "destructive"
      });
    }
  };

  // Criar link de afiliado
  const createAffiliateLink = async (affiliateId: string, productType: 'all' | 'professional_monthly' | 'professional_yearly' | 'enterprise_monthly' | 'enterprise_yearly') => {
    try {
      // Gerar código único
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_affiliate_link_code');

      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('affiliate_links')
        .insert([{
          affiliate_id: affiliateId,
          link_code: codeData,
          product_type: productType
        }])
        .select()
        .single();

      if (error) throw error;

      await loadAffiliateLinks();
      
      toast({
        title: "Sucesso",
        description: "Link de afiliado criado com sucesso"
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar link:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar link de afiliado",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Gerar URL de afiliação direta para checkout
  const generateAffiliateUrl = (linkCode: string, productType?: string) => {
    const baseUrl = window.location.origin;
    
    // Se o productType não for 'all', gerar URL direta para checkout
    if (productType && productType !== 'all') {
      // Extrair planType e billing do productType
      const [planType, billing] = productType.split('_');
      return `${baseUrl}/checkout?ref=${linkCode}&plan=${planType}&billing=${billing}`;
    }
    
    // Para 'all' ou sem productType específico, manter o comportamento atual
    return `${baseUrl}/planos?ref=${linkCode}`;
  };

  // Carregar todos os dados
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAffiliates(),
        loadAffiliateLinks(),
        loadAffiliateSales(),
        loadAffiliateCommissions()
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [affiliates, affiliateLinks, affiliateSales, affiliateCommissions]);

  return {
    // Estados
    affiliates,
    affiliateLinks,
    affiliateSales,
    affiliateCommissions,
    affiliatesStats,
    loading,
    
    // Ações
    loadAffiliates,
    loadAffiliateLinks,
    loadAffiliateSales,
    loadAffiliateCommissions,
    createAffiliate,
    updateAffiliate,
    createAffiliateLink,
    generateAffiliateUrl,
    loadAllData
  };
};