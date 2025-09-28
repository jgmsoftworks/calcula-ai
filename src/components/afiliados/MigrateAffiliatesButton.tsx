import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";

export function MigrateAffiliatesButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleMigration = async () => {
    setLoading(true);
    
    try {
      toast({
        title: "Migração iniciada",
        description: "Criando produtos únicos no Stripe para afiliados existentes..."
      });

      const { data, error } = await supabase.functions.invoke('migrate-existing-affiliates');

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Migração concluída!",
          description: data.message,
        });
      } else {
        toast({
          title: "Migração com problemas",
          description: data?.message || "Alguns afiliados não puderam ser migrados",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erro na migração:', error);
      toast({
        title: "Erro na migração",
        description: "Erro ao migrar afiliados existentes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleMigration} 
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Migrando...
        </>
      ) : (
        <>
          <Upload className="h-4 w-4 mr-2" />
          Migrar Afiliados Existentes
        </>
      )}
    </Button>
  );
}