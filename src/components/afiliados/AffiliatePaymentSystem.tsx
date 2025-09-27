import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";

interface PaymentRequest {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  amount: number;
  pix_key: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  processed_at?: string;
  payment_details?: any;
  notes?: string;
}

export function AffiliatePaymentSystem() {
  const { toast } = useToast();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    transaction_id: '',
    payment_method: 'pix',
    notes: ''
  });

  useEffect(() => {
    loadPaymentRequests();
  }, []);

  const loadPaymentRequests = async () => {
    try {
      // Buscar comissões pendentes que podem ser pagas
      const { data: commissions, error } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          affiliates!affiliate_commissions_affiliate_id_fkey(name, pix_key)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por afiliado
      const groupedCommissions = commissions?.reduce((acc: any, commission: any) => {
        const affiliateId = commission.affiliate_id;
        if (!acc[affiliateId]) {
          acc[affiliateId] = {
            id: `payment_${affiliateId}`,
            affiliate_id: affiliateId,
            affiliate_name: commission.affiliates?.name || 'N/A',
            pix_key: commission.affiliates?.pix_key || '',
            amount: 0,
            status: 'pending' as const,
            requested_at: new Date().toISOString(),
            commissions: []
          };
        }
        acc[affiliateId].amount += commission.amount;
        acc[affiliateId].commissions.push(commission);
        return acc;
      }, {});

      setPaymentRequests(Object.values(groupedCommissions || {}));
    } catch (error) {
      console.error('Erro ao carregar solicitações de pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações de pagamento",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (paymentRequest: PaymentRequest) => {
    if (!paymentForm.transaction_id.trim()) {
      toast({
        title: "Erro",
        description: "ID da transação é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setProcessingPayment(paymentRequest.id);
    
    try {
      // Atualizar todas as comissões do afiliado como pagas
      const { error: updateError } = await supabase
        .from('affiliate_commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: paymentForm.payment_method,
          payment_details: {
            transaction_id: paymentForm.transaction_id,
            payment_method: paymentForm.payment_method,
            notes: paymentForm.notes,
            processed_by: (await supabase.auth.getUser()).data.user?.id
          }
        })
        .eq('affiliate_id', paymentRequest.affiliate_id)
        .eq('status', 'approved');

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Pagamento processado com sucesso"
      });

      // Recarregar dados
      await loadPaymentRequests();
      
      // Limpar formulário
      setPaymentForm({
        transaction_id: '',
        payment_method: 'pix',
        notes: ''
      });
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'processing':
        return <Badge variant="default"><DollarSign className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Pago</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Carregando pagamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Pagamentos</CardTitle>
          <CardDescription>
            Processe pagamentos de comissões para afiliados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma solicitação de pagamento pendente
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave PIX</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.affiliate_name}
                    </TableCell>
                    <TableCell>
                      R$ {request.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {request.pix_key || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.requested_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!request.pix_key || request.status !== 'pending'}
                          >
                            Processar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Processar Pagamento</DialogTitle>
                            <DialogDescription>
                              Confirme o pagamento para {request.affiliate_name} no valor de R$ {request.amount.toFixed(2)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Chave PIX do Afiliado</Label>
                              <Input value={request.pix_key} disabled />
                            </div>
                            <div>
                              <Label htmlFor="transaction_id">ID da Transação *</Label>
                              <Input
                                id="transaction_id"
                                value={paymentForm.transaction_id}
                                onChange={(e) => setPaymentForm({
                                  ...paymentForm,
                                  transaction_id: e.target.value
                                })}
                                placeholder="Ex: TXN123456789"
                              />
                            </div>
                            <div>
                              <Label htmlFor="payment_method">Método de Pagamento</Label>
                              <Select
                                value={paymentForm.payment_method}
                                onValueChange={(value) => setPaymentForm({
                                  ...paymentForm,
                                  payment_method: value
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="transfer">Transferência Bancária</SelectItem>
                                  <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="notes">Observações</Label>
                              <Textarea
                                id="notes"
                                value={paymentForm.notes}
                                onChange={(e) => setPaymentForm({
                                  ...paymentForm,
                                  notes: e.target.value
                                })}
                                placeholder="Observações sobre o pagamento..."
                              />
                            </div>
                            <Button
                              onClick={() => processPayment(request)}
                              disabled={processingPayment === request.id}
                              className="w-full"
                            >
                              {processingPayment === request.id ? "Processando..." : "Confirmar Pagamento"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}