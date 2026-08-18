import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import type { TrendResult } from '../../utils/calculations';
import './cards.css';

interface WeightCardProps {
  latestWeight: number | null;
  delta14Days: number | null;
  trend: TrendResult;
  onRegister: () => void;
}

export function WeightCard({ latestWeight, delta14Days, trend, onRegister }: WeightCardProps) {
  if (latestWeight === null) {
    return (
      <Card className="rumo-metric-card">
        <EmptyState
          icon="⚖️"
          title="Ainda não registramos seu peso."
          description="Registre seu primeiro peso para começar a acompanhar sua evolução."
          action={
            <button type="button" className="rumo-water-quick-btn" onClick={onRegister}>
              Registrar peso
            </button>
          }
        />
      </Card>
    );
  }

  const arrow = (value: number) => (value < 0 ? '↓' : value > 0 ? '↑' : '→');

  return (
    <Card className="rumo-metric-card">
      <div className="rumo-metric-card-header">
        <span className="rumo-metric-card-label">Peso atual</span>
        <span className="rumo-metric-card-emoji" aria-hidden="true">
          ⚖️
        </span>
      </div>
      <p className="rumo-metric-card-value">
        {latestWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
        <span className="rumo-metric-card-value-goal">kg</span>
      </p>
      {delta14Days !== null && (
        <p className="rumo-weight-trend">
          <span className="rumo-weight-trend-value">
            {arrow(delta14Days)} {Math.abs(delta14Days).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
          </span>{' '}
          nos últimos 14 dias
        </p>
      )}
      <p className="rumo-weight-trend">
        {trend.hasTrend && trend.kgPerWeek !== null ? (
          <>
            <span className="rumo-weight-trend-value">
              {arrow(trend.kgPerWeek)}{' '}
              {Math.abs(trend.kgPerWeek).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg/semana
            </span>{' '}
            de tendência
          </>
        ) : (
          'Continue registrando seu peso para gerar uma tendência.'
        )}
      </p>
    </Card>
  );
}
