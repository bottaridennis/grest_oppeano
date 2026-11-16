import { useEffect, useState } from 'react';
import type { GrestData } from '../../hooks/useGrestData';
import type { LegalType } from '../../types';
import { DEFAULT_LEGAL_CONTENT, LEGAL_TITLES } from '../../constants';
import { formatDateTime } from '../../lib/utils';
import { saveLegal } from '../../lib/actions';
import { Segmented } from '../../components/ui';
import { useToast } from '../../components/feedback';

export default function LegalEditor({ data }: { data: GrestData }) {
  const toast = useToast();
  const [type, setType] = useState<LegalType>('privacy');
  const doc = data.legal.find((l) => l.type === type);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(doc?.content ?? DEFAULT_LEGAL_CONTENT[type]);
    // Ricarica solo quando cambia la pagina selezionata o il documento salvato.
  }, [type, doc?.id, doc?.updatedAt?.toMillis?.()]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = text !== (doc?.content ?? DEFAULT_LEGAL_CONTENT[type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Segmented
          value={type}
          onChange={(t) => {
            if (dirty && !window.confirm('Ci sono modifiche non salvate. Vuoi scartarle?')) return;
            setType(t);
          }}
          options={(Object.keys(LEGAL_TITLES) as LegalType[]).map((t) => ({ value: t, label: LEGAL_TITLES[t] }))}
        />
        <p className="text-xs text-muted">{doc ? `Ultimo salvataggio: ${formatDateTime(doc.updatedAt)}` : 'Testo predefinito, non ancora salvato'}</p>
      </div>
      <textarea className="input min-h-[420px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex justify-end gap-2">
        <button className="btn btn-secondary" disabled={!dirty} onClick={() => setText(doc?.content ?? DEFAULT_LEGAL_CONTENT[type])}>
          Annulla modifiche
        </button>
        <button
          className="btn btn-primary"
          disabled={saving || (!dirty && !!doc)}
          onClick={async () => {
            setSaving(true);
            try {
              await saveLegal(type, text, doc);
              toast.success('Pagina salvata.');
            } catch (e) {
              toast.error(e);
            } finally {
              setSaving(false);
            }
          }}
        >
          Salva pagina
        </button>
      </div>
    </div>
  );
}
