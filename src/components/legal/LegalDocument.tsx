import { Fragment, useEffect } from 'react';
import { LEGAL_RELEASE, type LegalDocumentKey } from '@/lib/legal';
import { LegalLayout } from './LegalLayout';
import { ManageCookiesButton } from './CookieBanner';

export function LegalDocument({ documentKey }: { documentKey: LegalDocumentKey }) {
  const document = LEGAL_RELEASE.documents[documentKey];
  const operator = LEGAL_RELEASE.operator;
  useEffect(() => { window.document.title = `${document.title} — Calcula Aí`; }, [document.title]);
  return <LegalLayout title={document.title} lastUpdated={LEGAL_RELEASE.updatedAt.split('-').reverse().join('/')} version={LEGAL_RELEASE.version}>
    {LEGAL_RELEASE.status !== 'published' && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">Rascunho em preparação. A identificação da empresa e as pendências de publicação ainda precisam ser concluídas. Esta versão não está vigente.</p>}
    <h2>Quem opera a Calcula Aí</h2>
    {operator.name && operator.taxId && operator.address ? <p>{operator.name} · {operator.taxId}<br />{operator.address}</p> : <p>Identificação da empresa pendente para publicação.</p>}
    {operator.supportEmail && <p>Atendimento: <a href={`mailto:${operator.supportEmail}`}>{operator.supportEmail}</a></p>}
    {operator.privacyEmail && <p>Privacidade: <a href={`mailto:${operator.privacyEmail}`}>{operator.privacyEmail}</a></p>}
    {document.sections.map(section => <Fragment key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</Fragment>)}
    {documentKey === 'cookies' && <ManageCookiesButton className="text-primary underline" />}
  </LegalLayout>;
}
