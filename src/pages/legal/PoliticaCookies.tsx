import { useEffect } from 'react';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { ManageCookiesButton } from '@/components/legal/CookieBanner';

export default function PoliticaCookies() {
  useEffect(() => {
    document.title = 'Política de Cookies — Calcula Ai';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'Política de Cookies do Calcula Ai. Saiba quais cookies usamos e como gerenciar suas preferências.');
  }, []);

  return (
    <LegalLayout title="Política de Cookies" lastUpdated="15/05/2026">
      <p>
        Esta política explica o que são cookies, quais utilizamos no <strong>Calcula Ai</strong> e como você pode
        gerenciar suas preferências a qualquer momento.
      </p>

      <h2>O que são cookies</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles
        permitem que o site lembre suas ações e preferências (login, idioma, escolhas de exibição) por um
        período. Também usamos tecnologias semelhantes, como <em>localStorage</em> e <em>sessionStorage</em>, com
        as mesmas regras desta política.
      </p>

      <h2>Categorias que utilizamos</h2>

      <h3>1. Necessários (sempre ativos)</h3>
      <p>
        Permitem login, manutenção da sessão, segurança e funcionamento básico. Sem eles a aplicação não
        funciona. Base legal: <strong>execução de contrato</strong> e <strong>legítimo interesse</strong> (LGPD
        art. 7º, V e IX).
      </p>
      <ul>
        <li><code>sb-*</code> — token de sessão Supabase Auth (autenticação).</li>
        <li><code>calculaai_anon_id</code> — identificador anônimo do navegador.</li>
        <li><code>calculaai_cookie_consent_v1</code> — registro da sua escolha sobre cookies.</li>
      </ul>

      <h3>2. Análise de uso (opcionais)</h3>
      <p>
        Apenas se você consentir. Usamos <strong>Google Analytics 4</strong> com IP anonimizado para entender
        como o app é utilizado. Base legal: <strong>consentimento</strong> (LGPD art. 7º, I).
      </p>
      <ul>
        <li><code>_ga</code>, <code>_ga_*</code> — Google Analytics 4 (validade até 2 anos).</li>
      </ul>

      <h3>3. Marketing (opcionais)</h3>
      <p>
        Categoria reservada para futuras campanhas. Atualmente <strong>não carregamos</strong> pixels de
        remarketing nem cookies de terceiros publicitários.
      </p>

      <h2>Transferência internacional</h2>
      <p>
        O Google Analytics processa dados em servidores fora do Brasil (EUA e UE). A transferência ocorre com
        base em cláusulas contratuais padrão e somente após seu consentimento explícito.
      </p>

      <h2>Como gerenciar</h2>
      <p>
        Você pode aceitar, recusar ou personalizar suas escolhas a qualquer momento clicando no botão abaixo.
        Também é possível bloquear cookies diretamente nas configurações do seu navegador, mas isso pode afetar
        funcionalidades.
      </p>
      <p className="not-prose">
        <span className="inline-flex">
          <ManageCookiesButton className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-90 no-underline" />
        </span>
      </p>

      <h2>Mudanças</h2>
      <p>
        Esta política pode ser atualizada. Em mudanças relevantes, voltaremos a solicitar seu consentimento via
        banner.
      </p>

      <h2>Contato</h2>
      <p>
        DPO: <a href="mailto:dpo@calculaaibr.com">dpo@calculaaibr.com</a>
      </p>
    </LegalLayout>
  );
}
