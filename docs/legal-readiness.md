# Calcula Aí — implementação jurídica e privacidade

Data da análise: 28/10/2026. Estado: **rascunho de implementação; não publicado**.

## O que foi implementado nesta alteração

- Fonte única dos três documentos em `src/legal/release.json`, com versão independente de cookies.
- Textos sobre teste de sete dias com limites do Iniciante, contratação expressa, término do teste sem apagar dados e distinção entre cancelamento da assinatura e exclusão da conta.
- Identificação empresarial centralizada, ainda vazia. Nenhuma razão social, CPF/CNPJ, endereço, DPO ou caixa de e-mail foi inventado.
- Confirmação autenticada dos documentos após login, incluindo Google e confirmação por e-mail. O cadastro não tenta fabricar um recibo sem sessão. Privacidade, documentos, gestão da assinatura e saída continuam acessíveis.
- Recibos separados das preferências opcionais. O servidor define titular e data; clientes não podem inserir, alterar ou apagar recibos diretamente. O texto publicado é imutável e vinculado por versão e SHA-256. Aceites antigos não são convertidos em aceites da nova versão.
- A tela confirma o mesmo hash do documento que está exibindo. Uma versão desatualizada exige recarregamento. O bloqueio da interface é uma etapa de contratação, não substitui as políticas de autorização das APIs de negócio.
- Exportação paginada, com itens de receitas e ordens de produção filtrados pelos pais pertencentes ao titular. Não há retorno de sucesso parcial. O arquivo informa escopo e ausência de uma fotografia transacional única. Limite síncrono: 100 mil registros; casos maiores exigem atendimento.
- Preferências opcionais malformadas são descartadas; a revogação desabilita a coleta do Analytics já carregado.
- `npm run build` impede a publicação com identificação vazia ou status de rascunho. `npm run build:dev` permite revisar a prévia.

## Pendências reais antes de colocar os documentos em vigor

1. **Operador:** obter nome/razão social, CPF/CNPJ aplicável, endereço comercial, e-mail de atendimento e canal efetivo de privacidade. Os campos de faturamento consultados não tinham CNPJ preenchido. Confirmar que alguém recebe e trata as solicitações; não basta criar um endereço no texto.
2. **Exclusão:** `request-account-deletion` e `purge-deleted-accounts` existentes ignoram alguns erros retornados pelo banco. O agendamento não é transacional, o processamento não cobre de forma demonstrada todos os anexos e registros relacionados, e não há cancelamento Stripe integrado. Esta alteração não reescreve esse processo destrutivo. Corrigir e testar com conta descartável antes de prometer conclusão automática. A interface passa a descrever uma solicitação agendada, sem desativação instantânea ou eliminação de todas as cópias.
3. **Cobrança:** validar no ambiente adequado os caminhos de cancelamento, reembolso, ausência de nova cobrança depois do encerramento e a relação entre conta e cliente Stripe. Não confundir teste gratuito com assinatura recorrente. Nenhum produto ou preço de teste de Portugal deve ser ativado em produção.
4. **Fornecedores e transferências:** confirmar contratos/DPA, subprocessadores e mecanismo aplicável a cada transferência. Não foi comprovada assinatura de cláusulas padrão ANPD ou mecanismo europeu; por isso os textos não afirmam que já existem. Supabase atual: Estados Unidos/Virgínia; mudar idioma não muda essa localização.
5. **Retenção e incidentes:** definir prazos por finalidade, rotina de expurgo, cópias de segurança, responsável por incidentes e registro de solicitações. A análise não comprovou um prazo universal de cinco anos nem remoção de backups em 30 dias.
6. **Portugal:** preparar revisão própria de privacidade, contratação, informação pré-contratual, regras de consumo quando aplicáveis, eventual representação na UE e transferências. Traduzir a interface e cobrar em euros não conclui essas obrigações. Este documento base em pt-BR não é uma certificação de prontidão europeia.
7. **Revisão jurídica:** submeter os fatos e textos a profissional qualificado para ajustar as obrigações concretas. A implementação registra evidências e corrige comportamentos; não constitui imunidade jurídica nem parecer profissional.

## Publicação e reversão

1. Concluir os itens acima e preencher `operator` em `src/legal/release.json`. Não editar uma versão que já tenha sido publicada; incrementar a versão.
2. Alterar `status` para `published`; executar `node scripts/legal-release.mjs`. A validação verifica campos e estrutura, não autenticidade dos dados ou conformidade jurídica.
3. Aplicar a migração `20261028164202_legal_acceptance_receipts.sql` em ambiente de teste e repetir testes. A migração cria somente a estrutura; não registra aceite de ninguém e não ativa texto de rascunho.
4. Gerar SQL de publicação com `node scripts/legal-release.mjs --sql`. Arquivar esse SQL como próxima migração gerada pelo CLI. O SQL contém a cópia integral do documento, hash e ativação atômica. Não executar a saída contra produção sem os testes de implantação.
5. Coordenar publicação do documento, frontend e `export-my-data` (incluindo `_shared/privacyExport.ts` e `_shared/rateLimit.ts`). O frontend recusa versões/hashes diferentes. A exportação depende da nova tabela de recibos. Verificar o fluxo antes de disponibilizar o frontend.
6. Testar cadastro por senha com e sem confirmação de e-mail, Google com conta nova e existente, falha de rede, troca de conta, documento atualizado, recusa, exportação e gestão de assinatura com teste expirado. Verificar advisors antes/depois; os avisos preexistentes não foram corrigidos nesta tarefa.
7. Para reverter frontend, restaurar a revisão anterior. Não apagar recibos nem textos já aceitos. Se reativar uma versão anterior, publicar o frontend correspondente. Não desfazer tabelas que já tenham dados.

## Validação reproduzível

```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/components/legal/LegalAcceptanceGate.test.tsx src/lib/__tests__/privacy-export.test.ts src/lib/__tests__/consent.test.ts
node --test scripts/legal-release.test.mjs
# Instalar @electric-sql/pglite em ambiente local, sem scripts de instalação.
node scripts/test-legal-database.mjs
npm run build:dev
npm run legal:check  # deve falhar enquanto os dados reais estiverem vazios
```

Os testes SQL usam Postgres embarcado local. Não criam contas nem excluem dados de produção. As verificações de permissões cobrem usuário diferente, escrita direta, data adulterada, anonimato, versão antiga, aceite incompleto e documento modificado.

## Como aproveitar ctresb/leis sem importar gigabytes

O [repositório ctresb/leis](https://github.com/ctresb/leis) é uma coleção de textos legislativos convertidos. Pode servir de apoio à pesquisa, com consulta ao original, vigência e jurisdição. Não funciona como certificado de conformidade nem precisa estar no bundle, no banco ou no servidor do produto.

Manter esta seleção pequena de fontes oficiais e registrar, para cada obrigação, responsável, comportamento do sistema e evidência da conferência. Não enviar dados de clientes para uma IA jurídica por causa desse repositório.

| Fonte primária | Uso na revisão |
| --- | --- |
| [LGPD — Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) | Finalidade, bases legais, direitos, segurança e agentes de tratamento |
| [LGPD art. 18 — Senado](https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709!art18) | Acesso, correção e outros direitos; exportar JSON não resolve todos os direitos |
| [CDC — Lei 8.078/1990](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) | Oferta, informação, contratação e direitos quando houver relação de consumo |
| [Decreto 7.962/2013](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm) | Identificação do fornecedor e contratação eletrônica |
| [ANPD — segurança para pequenos agentes](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte) | Medidas práticas, responsabilidades e controles |
| [ANPD — transferências internacionais](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados) | Verificar o mecanismo efetivamente aplicável, além da base legal |
| [Resolução ANPD 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024) | Regulamento e cláusulas padrão de transferência; conferir redação atual |
| [RGPD — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=pt) | Âmbito territorial, transparência, direitos e transferências para expansão à UE |

Não foi copiada a base inteira nem incorporado conteúdo OCR como fonte normativa definitiva. As páginas públicas ainda vigentes e o banco de produção não foram alterados nesta etapa.
