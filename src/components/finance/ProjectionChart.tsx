import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { addMonths, formatCurrency, formatShortMonthLabel, toMonthKey } from '../../utils/finance';
import type { ProjectionPoint } from '../../utils/financePlanning';

/** Cores validadas para daltonismo e contraste (verde = guardado, azul = dívidas). */
const SAVED_COLOR = '#2f9e78';
const DEBT_COLOR = '#4a68c9';

const COMPACT = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function ProjectionChart({ points }: { points: ProjectionPoint[] }) {
  const start = toMonthKey(new Date());
  const data = points.map((p) => ({
    label: p.month === 0 ? 'Hoje' : formatShortMonthLabel(addMonths(start, p.month)).replace(/ de \d{4}$/, '').replace(/\s\d{4}$/, ''),
    guardado: p.savedCents / 100,
    dividas: p.debtCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rumo-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--rumo-gray)" tickLine={false} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 11 }}
          stroke="var(--rumo-gray)"
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(value: number) => COMPACT.format(value)}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid var(--rumo-border)', fontSize: 13 }}
          formatter={(value, name) => [formatCurrency(Math.round(Number(value) * 100)), name]}
        />
        <Legend verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="guardado" name="Guardado" stroke={SAVED_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line
          type="monotone"
          dataKey="dividas"
          name="Dívidas"
          stroke={DEBT_COLOR}
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
