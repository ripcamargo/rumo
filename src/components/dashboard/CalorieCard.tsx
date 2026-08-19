import { Card } from '../common/Card';
import './cards.css';

export function CalorieCard({
  consumed,
  goal,
  onOpenLog,
}: {
  consumed: number;
  goal: number;
  onOpenLog: () => void;
}) {
  const remaining = goal - consumed;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = remaining < 0;

  return (
    <Card className="rumo-metric-card">
      <button type="button" className="rumo-metric-card-header rumo-metric-card-header-btn" onClick={onOpenLog}>
        <span className="rumo-metric-card-label">Calorias</span>
        <span className="rumo-metric-card-emoji" aria-hidden="true">
          🔥
        </span>
      </button>
      <p className="rumo-metric-card-value">
        {consumed.toLocaleString('pt-BR')}{' '}
        <span className="rumo-metric-card-value-goal">/ {goal.toLocaleString('pt-BR')} kcal</span>
      </p>
      <div className="rumo-progress-track">
        <div
          className={`rumo-progress-fill ${over ? 'rumo-progress-fill--over' : ''}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className={`rumo-metric-card-note ${over ? 'rumo-metric-card-note--over' : ''}`}>
        {over
          ? `${Math.abs(remaining).toLocaleString('pt-BR')} kcal acima da meta`
          : `${remaining.toLocaleString('pt-BR')} kcal restantes`}
      </p>
    </Card>
  );
}
