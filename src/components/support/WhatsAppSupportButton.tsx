import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';

export const WhatsAppSupportButton = () => {
  const { user } = useAuth();

  const phoneNumber = '556292622545';
  const message = `Olá, preciso de ajuda com o sistema CalulaAi. Meu email cadastrado é ${user?.email || 'não informado'}.`;
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={whatsappURL}
            target="_blank"
            rel="noopener noreferrer"
            className="support-pulse inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500 p-0 shadow-lg transition-colors duration-200 hover:bg-green-600"
            aria-label="Suporte via WhatsApp"
          >
            <MessageCircle className="h-5 w-5 text-white" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
          <p>Suporte via WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
