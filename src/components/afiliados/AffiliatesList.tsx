import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, DollarSign } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function AffiliatesList() {
  const { affiliates, loading, createAffiliate, updateAffiliate } = useAffiliates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    document: "",
    commission_percentage: 10,
    commission_type: "percentage" as "percentage" | "fixed",
    commission_fixed_amount: 0,
    pix_key: "",
    bank_details: ""
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      document: "",
      commission_percentage: 10,
      commission_type: "percentage",
      commission_fixed_amount: 0,
      pix_key: "",
      bank_details: ""
    });
    setEditingAffiliate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAffiliate) {
        await updateAffiliate(editingAffiliate.id, {
          ...formData,
          bank_details: formData.bank_details ? JSON.parse(formData.bank_details) : null
        });
      } else {
        await createAffiliate({
          ...formData,
          bank_details: formData.bank_details ? JSON.parse(formData.bank_details) : null
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar afiliado:", error);
    }
  };

  const handleEdit = (affiliate: any) => {
    setEditingAffiliate(affiliate);
    setFormData({
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone || "",
      document: affiliate.document || "",
      commission_percentage: affiliate.commission_percentage,
      commission_type: affiliate.commission_type,
      commission_fixed_amount: affiliate.commission_fixed_amount || 0,
      pix_key: affiliate.pix_key || "",
      bank_details: affiliate.bank_details ? JSON.stringify(affiliate.bank_details) : ""
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800"
    };
    
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente"
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestão de Afiliados</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Afiliado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingAffiliate ? "Editar Afiliado" : "Novo Afiliado"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="document">CPF/CNPJ</Label>
                  <Input
                    id="document"
                    value={formData.document}
                    onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission_type">Tipo Comissão</Label>
                  <Select
                    value={formData.commission_type}
                    onValueChange={(value: "percentage" | "fixed") => 
                      setFormData(prev => ({ ...prev, commission_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual</SelectItem>
                      <SelectItem value="fixed">Valor Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.commission_type === "percentage" ? (
                  <div className="space-y-2">
                    <Label htmlFor="commission_percentage">Percentual (%)</Label>
                    <Input
                      id="commission_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        commission_percentage: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="commission_fixed_amount">Valor Fixo (R$)</Label>
                    <Input
                      id="commission_fixed_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.commission_fixed_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        commission_fixed_amount: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, pix_key: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_details">Dados Bancários (JSON)</Label>
                <Textarea
                  id="bank_details"
                  placeholder='{"banco": "001", "agencia": "1234", "conta": "12345-6", "titular": "Nome do Titular"}'
                  value={formData.bank_details}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_details: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAffiliate ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Total Vendas</TableHead>
              <TableHead>Clientes</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {affiliates.map((affiliate) => (
              <TableRow key={affiliate.id}>
                <TableCell className="font-medium">{affiliate.name}</TableCell>
                <TableCell>{affiliate.email}</TableCell>
                <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                <TableCell>
                  {affiliate.commission_type === 'percentage' 
                    ? `${affiliate.commission_percentage}%`
                    : `R$ ${affiliate.commission_fixed_amount?.toFixed(2)}`
                  }
                </TableCell>
                <TableCell>
                  R$ {affiliate.total_sales.toFixed(2)}
                </TableCell>
                <TableCell>{affiliate.total_customers}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(affiliate)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {affiliates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum afiliado cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}