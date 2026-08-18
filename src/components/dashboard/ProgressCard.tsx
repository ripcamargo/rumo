import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { calculateGoalProgress } from '../../utils/calculations';
import './cards.css';

interface ProgressCardProps {
  initialWeight: number;
  currentWeight: number | null;
  goalWeight: number;
  onConfigureGoal: () => void;
}

export function ProgressCard({
  initialWeight,
  currentWeight,
  goalWeight,
  onConfigureGoal,
}: ProgressCardProps) {
  if (!initialWeight || !goalWeight) {
    return (
      <Card className="rumo-metric-card rumo-dashboard-grid--wide">
        <EmptyState
          icon="🎯"
          title="Defina seu peso inicial e sua meta."
          description="Configure seus dados em Configurações para acompanhar seu progresso."
          action={
            <button type="button" className="rumo-water-quick-btn" onClick={onConfigureGoal}>
              Ir para Configurações
            </button>
          }
        />
      </Card>
    );
  }

  if (currentWeight === null) {
    return (
      <Card className="rumo-metric-card rumo-dashboard-grid--wide">
        <EmptyState icon="🎯" title="Registre seu peso para ver seu progresso até a meta." />
      </Card>
    );
  }

  const progress = calculateGoalProgress(initialWeight, currentWeight, goalWeight);
  const reachedGoal = currentWeight <= goalWeight && initialWeight > goalWeight;

  return (
    <Card className="rumo-metric-card rumo-dashboard-grid--wide">
      <div className="rumo-metric-card-header">
        <span className="rumo-metric-card-label">Progresso até a meta</span>
        <span className="rumo-metric-card-emoji" aria-hidden="true">
          🎯
        </span>
      </div>
      <div className="rumo-progress-bar-outer">
        <div className="rumo-progress-bar-inner" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rumo-progress-labels">
        <span>Início: {initialWeight.toLocaleString('pt-BR')} kg</span>
        <span>Atual: {currentWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</span>
        <span>Meta: {goalWeight.toLocaleString('pt-BR')} kg</span>
      </div>
      <p className="rumo-metric-card-note">
        {reachedGoal
          ? 'Meta atingida! 🎉'
          : `${Math.round(progress * 100)}% do caminho até a sua meta.`}
      </p>
    </Card>
  );
}
