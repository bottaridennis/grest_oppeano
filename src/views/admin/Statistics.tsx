import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../../firebase';
import { useCollection } from '../../hooks/useFirestore';
import type { GrestData } from '../../hooks/useGrestData';
import type { Attendance } from '../../types';
import { addDays, ageFrom, localISODate, parseISODate } from '../../lib/utils';
import { ROLE_LABELS, STATUS_LABELS } from '../../constants';

const C = { brand: '#F0592A', leaf: '#1F9D63', sun: '#FFC23D', sky: '#2F6FED', danger: '#DC2E4B', ink: '#1D1B2F', muted: '#6E6A7C', line: '#E9E2D6' };
const DAYS = 14;

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: `1px solid ${C.line}`, boxShadow: '0 8px 24px -8px rgb(29 27 47 / .18)', fontSize: 13 },
  cursor: { fill: 'rgb(29 27 47 / 0.04)' },
};

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="font-bold text-lg">{title}</h3>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="h-64 mt-4">{children}</div>
    </section>
  );
}

export default function Statistics({ data }: { data: GrestData }) {
  const from = localISODate(addDays(new Date(), -(DAYS - 1)));
  const { data: attendance } = useCollection<Attendance>(`stats-attendance:${from}`, () =>
    query(collection(db, 'attendance'), where('date', '>=', from)),
  );

  const attendanceTrend = useMemo(() => {
    const present = new Map<string, Set<string>>();
    for (const a of attendance) {
      if (!a.present) continue;
      if (!present.has(a.date)) present.set(a.date, new Set());
      present.get(a.date)!.add(a.registrationId);
    }
    return Array.from({ length: DAYS }, (_, i) => {
      const iso = localISODate(addDays(new Date(), -(DAYS - 1 - i)));
      return {
        date: parseISODate(iso)!.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        presenti: present.get(iso)?.size ?? 0,
      };
    });
  }, [attendance]);

  const status = (['confirmed', 'pending', 'cancelled'] as const).map((s, i) => ({
    name: STATUS_LABELS[s],
    value: data.allRegistrations.filter((r) => r.status === s).length,
    color: [C.leaf, C.sun, C.danger][i],
  }));

  const ages = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of data.allRegistrations) {
      if (r.status === 'cancelled') continue;
      const age = ageFrom(r.birthDate);
      if (age === null) continue;
      const key = age < 6 ? '<6' : age > 14 ? '15+' : String(age);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const order = ['<6', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15+'];
    return order.filter((k) => buckets.has(k)).map((k) => ({ eta: k, bambini: buckets.get(k)! }));
  }, [data.allRegistrations]);

  const surveys = data.surveys.map((s) => ({
    name: s.title.length > 18 ? s.title.slice(0, 17) + '…' : s.title,
    adesioni: data.allResponses.filter((r) => r.surveyId === s.id && r.participating).length,
  }));

  const roles = (['parent', 'animator', 'admin'] as const).map((r) => ({
    name: ROLE_LABELS[r],
    value: data.allUsers.filter((u) => u.role === r).length,
  }));

  const total = status.reduce((s, x) => s + x.value, 0);
  const axis = { stroke: C.muted, fontSize: 12, tickLine: false, axisLine: false } as const;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <ChartCard title="Presenze" subtitle={`Ultimi ${DAYS} giorni`}>
        <ResponsiveContainer>
          <AreaChart data={attendanceTrend} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="gPres" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.brand} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="date" {...axis} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} />
            <Area type="linear" dataKey="presenti" stroke={C.brand} strokeWidth={2.5} fill="url(#gPres)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Stato iscrizioni" subtitle={`${total} iscrizioni totali`}>
        <div className="h-full flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={status} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                  {status.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3 shrink-0">
            {status.map((s) => (
              <li key={s.name} className="flex items-center gap-2.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-muted w-20">{s.name}</span>
                <b className="tabular-nums">{s.value}</b>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <ChartCard title="Età dei partecipanti" subtitle="Iscrizioni attive">
        <ResponsiveContainer>
          <BarChart data={ages} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="eta" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="bambini" fill={C.sky} radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Adesioni alle gite">
        <ResponsiveContainer>
          <BarChart data={surveys} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={C.line} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axis} />
            <YAxis dataKey="name" type="category" width={120} {...axis} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="adesioni" fill={C.brand} radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Utenti per ruolo">
        <ResponsiveContainer>
          <BarChart data={roles} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid stroke={C.line} vertical={false} />
            <XAxis dataKey="name" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" name="Utenti" fill={C.ink} radius={[6, 6, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
