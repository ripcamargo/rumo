import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '../common/EmptyState';
import type { DailyTotal } from '../../utils/aggregations';

interface DailyBarChartProps {
  data: DailyTotal[];
  color: string;
  unit: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function DailyBarChart({ data, color, unit, emptyTitle, emptyDescription }: DailyBarChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="📊" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rumo-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid var(--rumo-border)', fontSize: 13 }}
          formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} ${unit}`, '']}
        />
        <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
