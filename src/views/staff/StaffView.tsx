import { useState } from 'react';
import type { GrestData } from '../../hooks/useGrestData';
import { PageHeader, Segmented } from '../../components/ui';
import AttendancePanel from './AttendancePanel';
import Roster from './Roster';

export default function StaffView({ data }: { data: GrestData }) {
  const [tab, setTab] = useState<'attendance' | 'roster'>('attendance');
  return (
    <div>
      <PageHeader
        eyebrow="Area animatori"
        title="Il gruppo di oggi"
        description="Registra le presenze e consulta le informazioni utili su ogni bambino."
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'attendance', label: 'Presenze' },
              { value: 'roster', label: 'Bambini' },
            ]}
          />
        }
      />
      {tab === 'attendance' ? <AttendancePanel registrations={data.allRegistrations} /> : <Roster registrations={data.allRegistrations} />}
    </div>
  );
}
