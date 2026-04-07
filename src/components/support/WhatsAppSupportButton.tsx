import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl transition-all duration-200 z-50 p-0 inline-flex items-center justify-center"
            aria-label="Suporte via WhatsApp"
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700">
          <p>Suporte via WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};