import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Clock, DollarSign, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliates } from "@/hooks/useAffiliates";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";

interface SupportHour {
  id: string;
  affiliate_id: string;
  customer_email: string;
  customer_name?: string;
  data: string;
  horas: number;
  descricao?: string;
  valor_hora: number;
  valor_total: number;
  status: string;
  created_at: string;
  affiliate?: { name: string; email: string };
}

export function SupportHours() {
  const { affiliates } = useAffiliates();
  const { toast } = useToast();
  const [supportHours, setSupportHours] = useState<SupportHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    affiliate_id: "",
    customer_email: "",
    customer_name: "",
    data: new Date().toISOString().split("T")[0],
    horas: 1,
    descricao: "",
    valor_hora: 10,
  });

  const loadSupportHours = async () => {
    try {
      const { data, error } = await supabase
        .from("vendedor_suporte_horas")
        .select(`*, affiliate:affiliates(name, email)`)
        .order("data", { ascending: false });

      if (error) throw error;
      setSupportHours((data as any) || []);
    } catch (error) {
      console.error("Erro ao carregar horas de suporte:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportHours();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.affiliate_id || !formData.customer_email || formData.horas <= 0) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("vendedor_suporte_horas").insert([{
        affiliate_id: formData.affiliate_id,
        customer_email: formData.customer_email,
        customer_name: formData.customer_name || null,
        data: formData.data,
        horas: formData.horas,
        descricao: formData.descricao || null,
        valor_hora: formData.valor_hora,
      }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Horas de suporte registradas" });
      setIsDialogOpen(false);
      setFormData({
        affiliate_id: "",
        customer_email: "",
        customer_name: "",
        data: new Date().toISOString().split("T")[0],
        horas: 1,
        descricao: "",
        valor_hora: 10,
      });
      loadSupportHours();
    } catch (error) {
      console.error("Erro ao registrar suporte:", error);
      toast({ title: "Erro", description: "Erro ao registrar horas de suporte", variant: "destructive" });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("vendedor_suporte_horas")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Sucesso", description: `Status atualizado para ${status === "paid" ? "pago" : "cancelado"}` });
      loadSupportHours();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  // When affiliate is selected, use their support_hourly_rate
  const handleAffiliateChange = (affiliateId: string) => {
    const affiliate = affiliates.find(a => a.id === affiliateId);
    setFormData(prev => ({
      ...prev,
      affiliate_id: affiliateId,
      valor_hora: (affiliate as any)?.support_hourly_rate || 10,
    }));
  };

  const pendingHours = supportHours.filter(s => s.status === "pending");
  const totalPendingValue = pendingHours.reduce((sum, s) => sum + s.valor_total, 0);
  const totalPendingHours = pendingHours.reduce((sum, s) => sum + s.horas, 0);
  const totalPaidValue = supportHours.filter(s => s.status === "paid").reduce((sum, s) => sum + s.valor_total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendingHours}h</div>
            <p className="text-xs text-muted-foreground">R$ {formatBRL(totalPendingValue)} a pagar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {formatBRL(totalPendingValue)}</div>
            <p className="text-xs text-muted-foreground">{pendingHours.length} registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {formatBRL(totalPaidValue)}</div>
            <p className="text-xs text-muted-foreground">Suporte já pago</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Registro de Horas de Suporte</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Suporte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Horas de Suporte</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Vendedor *</Label>
                  <Select value={formData.affiliate_id} onValueChange={handleAffiliateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {affiliates.filter(a => a.status === "active").map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email do Cliente *</Label>
                    <Input
                      type="email"
                      value={formData.customer_email}
                      onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Nome do Cliente</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Horas *</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={formData.horas}
                      onChange={e => setFormData({ ...formData, horas: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label>R$/hora</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor_hora}
                      onChange={e => setFormData({ ...formData, valor_hora: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Descrição do Suporte</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o suporte prestado..."
                  />
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium">
                    Total: R$ {formatBRL(formData.horas * formData.valor_hora)}
                  </p>
                </div>
                <Button type="submit" className="w-full">Registrar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Valor/h</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supportHours.map(sh => (
                <TableRow key={sh.id}>
                  <TableCell>{new Date(sh.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{sh.affiliate?.name}</TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{sh.customer_name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{sh.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{sh.horas}h</TableCell>
                  <TableCell>R$ {formatBRL(sh.valor_hora)}</TableCell>
                  <TableCell className="font-medium">R$ {formatBRL(sh.valor_total)}</TableCell>
                  <TableCell>
                    <Badge className={
                      sh.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      sh.status === "paid" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {sh.status === "pending" ? "Pendente" : sh.status === "paid" ? "Pago" : "Cancelado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sh.status === "pending" && (
                      <div className="flex space-x-1">
                        <Button variant="outline" size="sm" onClick={() => updateStatus(sh.id, "paid")}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(sh.id, "cancelled")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {supportHours.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma hora de suporte registrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
