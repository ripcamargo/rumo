import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../common/EmptyState';
import { formatShortDate } from '../../utils/dates';
import type { BodyMeasurement } from '../../types';

export function MeasurementChart({ entries }: { entries: BodyMeasurement[] }) {
  if (entries.length === 0) {
    return <EmptyState icon="📏" title="Sem registros para esta medida ainda." />;
  }

  const sorted = [...entries].sort(
    (a, b) => a.recordedAt.toDate().getTime() - b.recordedAt.toDate().getTime(),
  );
  const data = sorted.map((entry) => ({
    label: formatShortDate(entry.recordedAt.toDate()),
    valor: entry.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rumo-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid var(--rumo-border)', fontSize: 13 }}
          formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} cm`, '']}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke="var(--rumo-mint-dark)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
