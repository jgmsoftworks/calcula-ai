import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Plus, Copy, ExternalLink } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function AffiliatesLinks() {
  const { affiliates, affiliateLinks, loading, createAffiliateLink, generateAffiliateUrl } = useAffiliates();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<'all' | 'professional_monthly' | 'professional_yearly' | 'enterprise_monthly' | 'enterprise_yearly'>('all');

  const handleCreateLink = async () => {
    if (!selectedAffiliate) {
      toast({
        title: "Erro",
        description: "Selecione um afiliado",
        variant: "destructive"
      });
      return;
    }

    try {
      await createAffiliateLink(selectedAffiliate, selectedProduct);
      setIsDialogOpen(false);
      setSelectedAffiliate("");
      setSelectedProduct('all');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const copyToClipboard = async (linkCode: string, productType: string) => {
    const url = generateAffiliateUrl(linkCode, productType);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Sucesso",
        description: "Link copiado para a área de transferência"
      });
    } catch (error) {
      toast({
        title: "Erro", 
        description: "Erro ao copiar link",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Links de Afiliação</CardTitle>
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
          <CardTitle>Links de Afiliação</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Link de Afiliação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Afiliado</label>
                  <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um afiliado" />
                    </SelectTrigger>
                    <SelectContent>
                      {affiliates.filter(a => a.status === 'active').map(affiliate => (
                        <SelectItem key={affiliate.id} value={affiliate.id}>
                          {affiliate.name} ({affiliate.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Plano Específico</label>
                  <Select value={selectedProduct} onValueChange={(value: typeof selectedProduct) => setSelectedProduct(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Planos</SelectItem>
                      <SelectItem value="professional_monthly">Profissional Mensal - R$ 67/mês</SelectItem>
                      <SelectItem value="professional_yearly">Profissional Anual - R$ 540/ano</SelectItem>
                      <SelectItem value="enterprise_monthly">Empresarial Mensal - R$ 117/mês</SelectItem>
                      <SelectItem value="enterprise_yearly">Empresarial Anual - R$ 948/ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateLink} className="w-full">
                  Criar Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {affiliateLinks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum link de afiliação criado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>Conversões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliateLinks.map(link => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm">
                        {link.link_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      {link.affiliate?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {link.product_type === 'all' ? 'Todos' : 
                         link.product_type === 'professional_monthly' ? 'Prof. Mensal' :
                         link.product_type === 'professional_yearly' ? 'Prof. Anual' :
                         link.product_type === 'enterprise_monthly' ? 'Emp. Mensal' :
                         link.product_type === 'enterprise_yearly' ? 'Emp. Anual' :
                         link.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{link.clicks_count || 0}</TableCell>
                    <TableCell>{link.conversions_count || 0}</TableCell>
                    <TableCell>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(link.link_code, link.product_type)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(generateAffiliateUrl(link.link_code, link.product_type), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}