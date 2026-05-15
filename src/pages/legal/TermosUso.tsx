import { useEffect } from 'react';
import { LegalLayout } from '@/components/legal/LegalLayout';

export default function TermosUso() {
  useEffect(() => {
    document.title = 'Termos de Uso — Calcula Ai';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'Termos de Uso da plataforma Calcula Ai. Leia antes de utilizar o serviço.');
  }, []);

  return (
    <LegalLayout title="Termos de Uso" lastUpdated="15/05/2026">
      <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 not-prose mb-6">
        <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <strong>⚠️ Aviso ao operador do sistema:</strong> placeholder estrutural. Substitua pelo texto definitivo
          aprovado pelo seu advogado antes de publicar.
        </p>
      </div>

      <h2>1. Aceitação</h2>
      <p>
        Ao criar uma conta ou utilizar o Calcula Ai, você concorda com estes Termos de Uso e com a{' '}
        <a href="/politica-de-privacidade">Política de Privacidade</a>. Se não concordar, não utilize a
        plataforma.
      </p>

      <h2>2. Sobre o serviço</h2>
      <p>
        O Calcula Ai é uma plataforma SaaS de precificação para o setor alimentício, oferecendo cálculo de custos,
        markups, fichas técnicas e gestão de estoque em planos gratuitos e pagos.
      </p>

      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>Você deve ter pelo menos 18 anos.</li>
        <li>É responsável por manter a confidencialidade da senha.</li>
        <li>Informações falsas podem levar ao encerramento da conta.</li>
      </ul>

      <h2>4. Planos e pagamentos</h2>
      <p>
        Pagamentos recorrentes são processados via Stripe. Cancelamento pode ser feito a qualquer momento pelo
        portal do cliente; os valores já pagos não são reembolsados, exceto previsão legal em contrário (CDC).
      </p>

      <h2>5. Uso aceitável</h2>
      <p>É proibido:</p>
      <ul>
        <li>Usar a plataforma para atividades ilegais;</li>
        <li>Tentar burlar limites do plano contratado;</li>
        <li>Realizar engenharia reversa, scraping ou ataques;</li>
        <li>Compartilhar credenciais com terceiros.</li>
      </ul>

      <h2>6. Propriedade intelectual</h2>
      <p>
        Todo o software, marca, layout e conteúdo do Calcula Ai pertencem a [<em>Razão Social</em>]. Os dados que
        você insere (receitas, produtos, etc.) continuam sendo seus — mantemos apenas a licença necessária para
        operar o serviço.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        O Calcula Ai é fornecido "como está". Os cálculos são ferramentas de apoio à decisão e não substituem
        consultoria contábil ou jurídica. Não nos responsabilizamos por decisões comerciais tomadas com base em
        dados inseridos pelo próprio usuário.
      </p>

      <h2>8. Encerramento</h2>
      <p>
        Você pode encerrar sua conta a qualquer momento via página <strong>Minha Privacidade</strong>. Podemos
        suspender contas que violem estes termos, com aviso prévio quando possível.
      </p>

      <h2>9. Lei aplicável e foro</h2>
      <p>
        Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca de [<em>cidade/UF</em>] para
        dirimir controvérsias.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas? <a href="mailto:contato@calculaaibr.com">contato@calculaaibr.com</a>
      </p>
    </LegalLayout>
  );
}
