import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AffiliateRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Salvar cookie de afiliado
      const cookieValue = `${code}`;
      const expires = new Date();
      expires.setDate(expires.getDate() + 60); // 60 dias
      
      document.cookie = `aff_code=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
      
      // Redirecionar para seletor de planos do afiliado
      navigate(`/affiliate/${code}`, { replace: true });
    } else {
      // Se não tem código, vai direto pros planos
      navigate('/planos', { replace: true });
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Redirecionando...</h2>
          <p className="text-muted-foreground text-center">
            Você será redirecionado para selecionar um plano em instantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateRedirect;