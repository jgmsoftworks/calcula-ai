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
import { Plus, Copy, ExternalLink, Trash2, Tag } from "lucide-react";
import { useAffiliates } from "@/hooks/useAffiliates";
import { useAffiliateCoupons } from "@/hooks/useAffiliateCoupons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AffiliatesLinks() {
  const { affiliates, affiliateLinks, loading, createAffiliateLink, deleteAffiliateLink, generateAffiliateUrl } = useAffiliates();
  const { getActiveCouponsForAffiliate, formatDiscountValue } = useAffiliateCoupons();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<'all'>('all');

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
      await createAffiliateLink(selectedAffiliate, 'all');
      setIsDialogOpen(false);
      setSelectedAffiliate("");
      setSelectedProduct('all');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const copyToClipboard = async (linkCode: string) => {
    const url = generateAffiliateUrl(linkCode);
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
                <DialogTitle>Criar Link Geral de Afiliado</DialogTitle>
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
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Link Geral:</strong> O cliente será direcionado para uma página onde poderá escolher entre os planos Professional e Enterprise (mensal ou anual).
                  </p>
                </div>
                
                <Button onClick={handleCreateLink} className="w-full">
                  Criar Link Geral
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
                  <TableHead>Cupons</TableHead>
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
                      <Badge variant="default" className="bg-gradient-primary text-white">
                        Link Geral
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const activeCoupons = getActiveCouponsForAffiliate(link.affiliate_id);
                        return activeCoupons.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {activeCoupons.slice(0, 2).map(coupon => (
                              <Badge key={coupon.id} variant="secondary" className="text-xs flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {formatDiscountValue(coupon.discount_type, coupon.discount_value)}
                              </Badge>
                            ))}
                            {activeCoupons.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{activeCoupons.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sem cupons</span>
                        );
                      })()}
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
                          onClick={() => copyToClipboard(link.link_code)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(generateAffiliateUrl(link.link_code), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este link de afiliado? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAffiliateLink(link.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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