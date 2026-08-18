import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../common/EmptyState';
import { calculateMovingAverage, type WeightPoint } from '../../utils/calculations';
import { formatShortDate } from '../../utils/dates';

export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return (
      <EmptyState
        icon="📈"
        title="Sem registros de peso neste período."
        description="Registre seu peso para ver o gráfico de evolução."
      />
    );
  }

  const sorted = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const movingAverages = calculateMovingAverage(sorted, 7);

  const data = sorted.map((point, index) => ({
    label: formatShortDate(point.recordedAt),
    peso: point.weight,
    media: sorted.length >= 4 ? movingAverages[index]?.weight : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rumo-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid var(--rumo-border)',
            fontSize: 13,
          }}
          formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} kg`, '']}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="var(--rumo-gray-light)"
          strokeWidth={1.5}
          dot={{ r: 2 }}
          name="Peso"
        />
        {sorted.length >= 4 && (
          <Line
            type="monotone"
            dataKey="media"
            stroke="var(--rumo-mint-dark)"
            strokeWidth={2.5}
            dot={false}
            name="Média móvel (7d)"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
