import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AffiliatesCommissions() {
  const { affiliateCommissions, loading, loadAffiliateCommissions } = useAffiliates();
  const { toast } = useToast();
  const [processingCommission, setProcessingCommission] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    
    const labels = {
      pending: "Pendente",
      approved: "Aprovada",
      paid: "Paga",
      cancelled: "Cancelada"
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const updateCommissionStatus = async (commissionId: string, status: string, paymentDetails?: any) => {
    setProcessingCommission(commissionId);
    
    try {
      const updateData: any = { status };
      
      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.payment_details = paymentDetails;
      }

      const { error } = await supabase
        .from('affiliate_commissions')
        .update(updateData)
        .eq('id', commissionId);

      if (error) throw error;

      await loadAffiliateCommissions();
      
      toast({
        title: "Sucesso",
        description: `Comissão ${status === 'paid' ? 'marcada como paga' : status === 'approved' ? 'aprovada' : 'cancelada'}`
      });
    } catch (error) {
      console.error('Erro ao atualizar comissão:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar comissão",
        variant: "destructive"
      });
    } finally {
      setProcessingCommission(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingCommissions = affiliateCommissions.filter(c => c.status === 'pending');
  const approvedCommissions = affiliateCommissions.filter(c => c.status === 'approved');
  const paidCommissions = affiliateCommissions.filter(c => c.status === 'paid');

  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.amount, 0);
  const totalApproved = approvedCommissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = paidCommissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-4">
      {/* Resumo de comissões */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingCommissions.length} comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalApproved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedCommissions.length} comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {paidCommissions.length} comissões
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Afiliado</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PIX/Banco</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliateCommissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{commission.affiliate?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {commission.affiliate?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>R$ {commission.sale?.sale_amount.toFixed(2)}</div>
                      <div className="text-muted-foreground">
                        {commission.sale?.plan_type}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {commission.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(commission.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {commission.affiliate?.pix_key && (
                        <div>PIX: {commission.affiliate.pix_key}</div>
                      )}
                      {commission.affiliate?.bank_details && (
                        <div className="text-muted-foreground">
                          Dados bancários disponíveis
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {commission.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCommissionStatus(commission.id, 'approved')}
                            disabled={processingCommission === commission.id}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCommissionStatus(commission.id, 'cancelled')}
                            disabled={processingCommission === commission.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {commission.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCommissionStatus(commission.id, 'paid', {
                            method: 'pix',
                            date: new Date().toISOString()
                          })}
                          disabled={processingCommission === commission.id}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {commission.status === 'paid' && commission.paid_at && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(commission.paid_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {affiliateCommissions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma comissão registrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}