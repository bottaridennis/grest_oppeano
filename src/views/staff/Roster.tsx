import { useState } from 'react';
import { AlertTriangle, Phone, Search, Users } from 'lucide-react';
import type { Registration } from '../../types';
import { ageFrom, matches } from '../../lib/utils';
import { Avatar, EmptyState } from '../../components/ui';

/** Elenco dei bambini confermati con informazioni sanitarie (vista animatori). */
export default function Roster({ registrations }: { registrations: Registration[] }) {
  const [search, setSearch] = useState('');
  const [onlyAllergies, setOnlyAllergies] = useState(false);
  const kids = registrations
    .filter((r) => r.status === 'confirmed')
    .filter((r) => !onlyAllergies || r.allergies?.length || r.medicalNotes)
    .filter((r) => matches(search, r.childName, r.childSurname, `${r.childName} ${r.childSurname}`, ...(r.allergies ?? [])))
    .sort((a, b) => a.childSurname.localeCompare(b.childSurname, 'it'));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input className="input pl-9" placeholder="Cerca per nome o allergia…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className={`chip ${onlyAllergies ? 'chip-on' : ''}`} onClick={() => setOnlyAllergies((v) => !v)} aria-pressed={onlyAllergies}>
          <AlertTriangle className="w-3.5 h-3.5" /> Solo con note sanitarie
        </button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {kids.map((k) => {
          const age = ageFrom(k.birthDate);
          return (
            <article key={k.id} className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={`${k.childName} ${k.childSurname}`} tone="sky" />
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    {k.childName} {k.childSurname}
                  </p>
                  <p className="text-xs text-muted">{age !== null ? `${age} anni` : '—'}</p>
                </div>
              </div>
              {!!k.allergies?.length && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {k.allergies.map((a) => (
                    <span key={a} className="badge badge-danger">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {k.medicalNotes && <p className="text-sm text-ink-soft bg-surface-2 rounded-xl p-2.5 mt-3 whitespace-pre-line">{k.medicalNotes}</p>}
              {k.emergencyPhone && (
                <a href={`tel:${k.emergencyPhone.replace(/\s/g, '')}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-sky">
                  <Phone className="w-4 h-4" /> {k.emergencyPhone}
                </a>
              )}
            </article>
          );
        })}
      </div>
      {kids.length === 0 && <EmptyState icon={<Users className="w-6 h-6" />} title="Nessun bambino trovato" />}
    </div>
  );
}
