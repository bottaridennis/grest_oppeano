import { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { COMMON_ALLERGIES } from '../constants';
import type { Registration } from '../types';
import { cn, localISODate, normalize } from '../lib/utils';
import type { RegistrationInput } from '../lib/actions';
import { Field, SubmitButton } from './ui';

interface Props {
  initial?: Registration;
  siblings?: Registration[];
  submitLabel: string;
  onSubmit: (data: RegistrationInput) => Promise<void>;
  onCancel?: () => void;
}

/** Form condiviso per nuova iscrizione e modifica (genitore o admin). */
export default function RegistrationForm({ initial, siblings = [], submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<RegistrationInput>({
    childName: initial?.childName ?? '',
    childSurname: initial?.childSurname ?? '',
    birthDate: initial?.birthDate ?? '',
    allergies: initial?.allergies ?? [],
    medicalNotes: initial?.medicalNotes ?? '',
    emergencyPhone: initial?.emergencyPhone ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof RegistrationInput>(key: K, value: RegistrationInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleAllergy = (a: string) =>
    set('allergies', form.allergies.includes(a) ? form.allergies.filter((x) => x !== a) : [...form.allergies, a]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const duplicate = siblings.some(
      (r) =>
        r.id !== initial?.id &&
        r.status !== 'cancelled' &&
        normalize(r.childName) === normalize(form.childName) &&
        normalize(r.childSurname) === normalize(form.childSurname) &&
        r.birthDate === form.birthDate,
    );
    if (duplicate) {
      setError('Questo bambino risulta già iscritto.');
      return;
    }
    if (form.birthDate > localISODate()) {
      setError('La data di nascita non può essere nel futuro.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError((err as Error)?.message || 'Salvataggio non riuscito.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-danger-soft text-danger p-3.5 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome">
          <input required maxLength={99} className="input" value={form.childName} onChange={(e) => set('childName', e.target.value)} placeholder="Nome del bambino" />
        </Field>
        <Field label="Cognome">
          <input required maxLength={99} className="input" value={form.childSurname} onChange={(e) => set('childSurname', e.target.value)} placeholder="Cognome del bambino" />
        </Field>
        <Field label="Data di nascita">
          <input required type="date" max={localISODate()} className="input" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
        </Field>
        <Field label="Telefono di emergenza" hint="Un numero sempre raggiungibile durante il Grest.">
          <input type="tel" className="input" value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} placeholder="333 1234567" />
        </Field>
      </div>

      <div>
        <span className="field-label">Allergie e intolleranze</span>
        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGIES.map((a) => {
            const on = form.allergies.includes(a);
            return (
              <button key={a} type="button" onClick={() => toggleAllergy(a)} className={cn('chip', on && 'chip-on')} aria-pressed={on}>
                {on && <Check className="w-3.5 h-3.5" />}
                {a}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Note mediche o altre informazioni utili">
        <textarea
          rows={4}
          className="input"
          value={form.medicalNotes}
          onChange={(e) => set('medicalNotes', e.target.value)}
          placeholder="Altre allergie, farmaci, esigenze particolari da comunicare agli animatori…"
        />
      </Field>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Annulla
          </button>
        )}
        <SubmitButton loading={submitting} className="sm:min-w-44">
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
