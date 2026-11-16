import { DEFAULT_LEGAL_CONTENT, LEGAL_TITLES } from '../constants';
import type { LegalContent, LegalType } from '../types';
import { formatDate } from '../lib/utils';
import { PageHeader } from '../components/ui';

export default function Legal({ type, legal }: { type: LegalType; legal: LegalContent[] }) {
  const doc = legal.find((l) => l.type === type);
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Informazioni legali"
        title={LEGAL_TITLES[type]}
        description={doc?.updatedAt ? `Ultimo aggiornamento: ${formatDate(doc.updatedAt, { day: 'numeric', month: 'long', year: 'numeric' })}` : undefined}
      />
      <article className="card p-6 sm:p-10 text-ink-soft leading-relaxed whitespace-pre-line">
        {doc?.content?.trim() || DEFAULT_LEGAL_CONTENT[type]}
      </article>
    </div>
  );
}
