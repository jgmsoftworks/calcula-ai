import { useEffect } from 'react';
import { LegalLayout } from '@/components/legal/LegalLayout';

export default function PoliticaPrivacidade() {
  useEffect(() => {
    document.title = 'Política de Privacidade — Calcula Ai';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'Política de Privacidade do Calcula Ai conforme a LGPD. Saiba como tratamos seus dados pessoais.');
  }, []);

  return (
    <LegalLayout title="Política de Privacidade" lastUpdated="15/05/2026">
      <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 not-prose mb-6">
        <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <strong>⚠️ Aviso ao operador do sistema:</strong> este texto é um <strong>placeholder estrutural</strong>.
          Antes de publicar, substitua o conteúdo pelo texto definitivo aprovado pelo seu advogado/DPO. Os títulos
          abaixo seguem a estrutura mínima exigida pela LGPD (Lei 13.709/2018) e ANPD.
        </p>
      </div>

      <h2>1. Quem somos</h2>
      <p>
        <strong>Calcula Ai</strong> é uma plataforma SaaS de precificação inteligente para o setor alimentício,
        operada por [<em>Razão Social — CNPJ</em>], com sede em [<em>endereço</em>]. Para fins da LGPD, somos o{' '}
        <strong>controlador</strong> dos dados pessoais coletados nesta aplicação.
      </p>
      <p>
        Contato do <strong>Encarregado pelo Tratamento de Dados (DPO)</strong>:{' '}
        <a href="mailto:dpo@calculaaibr.com">dpo@calculaaibr.com</a>
      </p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li><strong>Dados cadastrais:</strong> nome, e-mail, telefone, nome do negócio.</li>
        <li><strong>Dados financeiros do negócio do usuário:</strong> receitas, custos, produtos, markups.</li>
        <li><strong>Dados de pagamento:</strong> processados diretamente pelo Stripe (não armazenamos cartão).</li>
        <li><strong>Dados de navegação:</strong> IP, user agent, páginas visitadas (somente com consentimento).</li>
      </ul>

      <h2>3. Para quê usamos seus dados (finalidades)</h2>
      <ul>
        <li>Prestação do serviço contratado (execução de contrato — art. 7º, V).</li>
        <li>Cumprimento de obrigações legais e fiscais (art. 7º, II).</li>
        <li>Comunicações operacionais por e-mail.</li>
        <li>Análise estatística agregada e melhoria do produto (com consentimento — art. 7º, I).</li>
      </ul>

      <h2>4. Com quem compartilhamos</h2>
      <p>Compartilhamos apenas com <strong>operadores</strong> indispensáveis ao serviço:</p>
      <ul>
        <li><strong>Supabase Inc.</strong> — hospedagem de banco de dados e autenticação (EUA).</li>
        <li><strong>Stripe Payments</strong> — processamento de pagamentos (EUA).</li>
        <li><strong>OpenAI</strong> — recursos opcionais de IA (EUA), com mascaramento de dados pessoais.</li>
        <li><strong>Google LLC</strong> — Analytics 4 (somente com consentimento), Google OAuth (login social).</li>
      </ul>
      <p>
        Há <strong>transferência internacional de dados</strong> para os Estados Unidos, baseada em cláusulas
        contratuais padrão e em interesse legítimo do titular (LGPD art. 33).
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <ul>
        <li>Dados de conta ativa: enquanto durar a relação contratual.</li>
        <li>Dados após exclusão da conta: até <strong>30 dias</strong> em soft delete (para arrependimento), depois purga definitiva.</li>
        <li>Logs de auditoria e dados fiscais: prazos legais aplicáveis (mínimo 5 anos quando exigido).</li>
      </ul>

      <h2>6. Seus direitos como titular (LGPD art. 18)</h2>
      <p>Você pode, a qualquer momento, exercer os direitos de:</p>
      <ul>
        <li>Confirmação da existência de tratamento;</li>
        <li>Acesso aos dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade (exportação em JSON);</li>
        <li>Eliminação dos dados tratados com consentimento;</li>
        <li>Informação sobre operadores e compartilhamentos;</li>
        <li>Revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer qualquer direito, acesse a página{' '}
        <strong>Minha Privacidade</strong> dentro do app ou escreva para{' '}
        <a href="mailto:privacidade@calculaaibr.com">privacidade@calculaaibr.com</a>.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas: criptografia em trânsito (TLS 1.2+), senhas com hash bcrypt,
        Row-Level Security no banco, controle de acesso por papéis, registros de auditoria e backups protegidos.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos cookies necessários, analíticos e de marketing. Detalhes na nossa{' '}
        <a href="/cookies">Política de Cookies</a>.
      </p>

      <h2>9. Alterações desta política</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão comunicadas pelo e-mail cadastrado e/ou por
        aviso destacado dentro do app, com no mínimo 15 dias de antecedência.
      </p>

      <h2>10. Autoridade Nacional</h2>
      <p>
        Se você acreditar que seus direitos não foram atendidos, pode contatar a{' '}
        <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>:{' '}
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">www.gov.br/anpd</a>.
      </p>
    </LegalLayout>
  );
}
