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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Links de Afiliação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Links de afiliação serão implementados aqui
        </div>
      </CardContent>
    </Card>
  );
}