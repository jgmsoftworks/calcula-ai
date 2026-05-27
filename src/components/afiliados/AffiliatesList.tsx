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
import { Plus, Edit, DollarSign, Power } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from '@/lib/formatters';
import { Textarea } from "@/components/ui/textarea";
import { AffiliateForm } from "./AffiliateForm";
import { MigrateAffiliatesButton } from "./MigrateAffiliatesButton";

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
        <div>
          <CardTitle>Gestão de Vendedores Parceiros</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Cada vendedor tem comissões diferenciadas: 1ª venda, recorrente e suporte
          </p>
        </div>
        <div className="flex gap-2">
          <MigrateAffiliatesButton />
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
              <AffiliateForm 
                editingAffiliate={editingAffiliate}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>1ª Venda</TableHead>
                <TableHead>Recorrente</TableHead>
                <TableHead>R$/hora</TableHead>
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
                  <TableCell>{(affiliate as any).commission_first_sale_pct || 40}%</TableCell>
                  <TableCell>{(affiliate as any).commission_recurring_pct || 20}%</TableCell>
                  <TableCell>R$ {formatBRL((affiliate as any).support_hourly_rate || 10)}</TableCell>
                  <TableCell>R$ {formatBRL(affiliate.total_sales)}</TableCell>
                  <TableCell>{affiliate.total_customers}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(affiliate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={affiliate.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => updateAffiliate(affiliate.id, {
                          status: affiliate.status === 'active' ? 'inactive' : 'active'
                        })}
                        title={affiliate.status === 'active' ? 'Desativar afiliado' : 'Ativar afiliado'}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {affiliates.map((affiliate) => (
            <Card key={affiliate.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{affiliate.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{affiliate.email}</p>
                </div>
                {getStatusBadge(affiliate.status)}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs">
                <div>
                  <p className="text-muted-foreground">1ª Venda</p>
                  <p className="font-medium">{(affiliate as any).commission_first_sale_pct || 40}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recorrente</p>
                  <p className="font-medium">{(affiliate as any).commission_recurring_pct || 20}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">R$/hora</p>
                  <p className="font-medium">R$ {formatBRL((affiliate as any).support_hourly_rate || 10)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendas</p>
                  <p className="font-medium">R$ {formatBRL(affiliate.total_sales)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clientes</p>
                  <p className="font-medium">{affiliate.total_customers}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(affiliate)}>
                  <Edit className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button
                  variant={affiliate.status === 'active' ? 'destructive' : 'default'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateAffiliate(affiliate.id, {
                    status: affiliate.status === 'active' ? 'inactive' : 'active'
                  })}
                >
                  <Power className="h-3 w-3 mr-1" />
                  {affiliate.status === 'active' ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {affiliates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum afiliado cadastrado
          </div>
        )}
      </CardContent>
    </Card>
  );
}