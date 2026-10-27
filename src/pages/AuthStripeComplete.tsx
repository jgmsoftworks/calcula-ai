import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const AuthStripeComplete = () => {
  usePortugalTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Capturar todos os parâmetros da URL atual
    const params = new URLSearchParams(searchParams);
    
    // Redirecionar para /auth/success mantendo todos os parâmetros
    const targetUrl = `/auth/success?${params.toString()}`;
    navigate(targetUrl, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-muted-foreground">{localizeText("Processando seu pagamento...")}</p>
      </div>
    </div>
  );
};

export default AuthStripeComplete;