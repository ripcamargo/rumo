import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { calculateGoalProgress } from '../../utils/calculations';
import './cards.css';

interface ProgressCardProps {
  initialWeight: number;
  currentWeight: number | null;
  goalWeight: number;
  suggestedGoalWeight?: number | null;
  bmi?: number | null;
  bmiClassification?: string | null;
  tmb?: number | null;
  tdee?: number | null;
  dailyCalorieGoal?: number | null;
  hasCustomGoal?: boolean;
  estimatedGoalDate?: Date | null;
  hasWeightTrend?: boolean;
  onConfigureGoal: () => void;
}

export function ProgressCard({
  initialWeight,
  currentWeight,
  goalWeight,
  suggestedGoalWeight,
  bmi,
  bmiClassification,
  tmb,
  tdee,
  dailyCalorieGoal,
  hasCustomGoal,
  estimatedGoalDate,
  hasWeightTrend,
  onConfigureGoal,
}: ProgressCardProps) {
  if (!initialWeight || !goalWeight) {
    return (
      <Card className="rumo-metric-card rumo-dashboard-grid--wide">
        <EmptyState
          icon="🎯"
          title="Complete seu perfil para gerar a meta automaticamente."
          description="Informe altura, data de nascimento e nível de atividade em Configurações."
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
  const goalLabel = hasCustomGoal ? 'Meta personalizada' : 'Meta sugerida';
  const hasSummaryData =
    (suggestedGoalWeight !== undefined && suggestedGoalWeight !== null && suggestedGoalWeight > 0) ||
    bmi !== undefined && bmi !== null && bmi > 0 ||
    tmb !== undefined && tmb !== null && tmb > 0 ||
    tdee !== undefined && tdee !== null && tdee > 0 ||
    dailyCalorieGoal !== undefined && dailyCalorieGoal !== null && dailyCalorieGoal > 0;

  return (
    <Card className="rumo-metric-card rumo-dashboard-grid--wide">
      <div className="rumo-metric-card-header">
        <span className="rumo-metric-card-label">Meta e progresso</span>
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
        <span>{goalLabel}: {goalWeight.toLocaleString('pt-BR')} kg</span>
      </div>
      <p className="rumo-metric-card-note">
        {reachedGoal
          ? 'Meta atingida! 🎉'
          : `${Math.round(progress * 100)}% do caminho até a sua meta.`}
      </p>
      {!reachedGoal && estimatedGoalDate && (
        <p className="rumo-progress-goal-date">
          📅 No ritmo atual, você deve atingir a meta em{' '}
          <strong>
            {estimatedGoalDate.toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </strong>
          .
        </p>
      )}
      {!reachedGoal && !estimatedGoalDate && hasWeightTrend && (
        <p className="rumo-metric-card-note" style={{ opacity: 0.8 }}>
          Seu peso não está em queda nos últimos dias — continue registrando para estimar uma data.
        </p>
      )}
      {hasSummaryData ? (
        <p className="rumo-metric-card-note" style={{ opacity: 0.8 }}>
          {suggestedGoalWeight !== undefined && suggestedGoalWeight !== null && suggestedGoalWeight > 0 && `Peso de referência: ${suggestedGoalWeight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg · `}
          {bmi !== undefined && bmi !== null && bmi > 0 && `IMC: ${bmi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${bmiClassification ? ` · ${bmiClassification}` : ''} · `}
          {tmb !== undefined && tmb !== null && tmb > 0 && `TMB: ${tmb.toLocaleString('pt-BR')} kcal · `}
          {tdee !== undefined && tdee !== null && tdee > 0 && `TDEE: ${tdee.toLocaleString('pt-BR')} kcal · `}
          {dailyCalorieGoal !== undefined && dailyCalorieGoal !== null && dailyCalorieGoal > 0 && `Meta diária: ${dailyCalorieGoal.toLocaleString('pt-BR')} kcal`}
        </p>
      ) : null}
    </Card>
  );
}
