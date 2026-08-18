export interface WeightPoint {
  weight: number;
  recordedAt: Date;
}

export function calculateCaloriesRemaining(consumed: number, goal: number): number {
  return goal - consumed;
}

export function calculateWaterRemaining(consumedMl: number, goalMl: number): number {
  return goalMl - consumedMl;
}

export function calculateWeightChange(from: number, to: number): number {
  return to - from;
}

/**
 * Progresso de 0 a 1 até a meta de peso. Lida com pesoInicial === pesoObjetivo
 * (meta já era o peso inicial) retornando 1 quando o peso atual bate a meta.
 */
export function calculateGoalProgress(
  initialWeight: number,
  currentWeight: number,
  goalWeight: number,
): number {
  const totalToLose = initialWeight - goalWeight;
  if (totalToLose === 0) {
    return currentWeight === goalWeight ? 1 : 0;
  }
  const progress = (initialWeight - currentWeight) / totalToLose;
  return Math.min(Math.max(progress, 0), 1);
}

export function findClosestPoint(points: WeightPoint[], target: Date): WeightPoint | null {
  if (points.length === 0) return null;
  let closest = points[0];
  let closestDiff = Math.abs(closest.recordedAt.getTime() - target.getTime());
  for (const point of points) {
    const diff = Math.abs(point.recordedAt.getTime() - target.getTime());
    if (diff < closestDiff) {
      closest = point;
      closestDiff = diff;
    }
  }
  return closest;
}

export function calculateMovingAverage(points: WeightPoint[], windowSize = 7): WeightPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  return sorted.map((point, index) => {
    const windowStart = Math.max(0, index - windowSize + 1);
    const window = sorted.slice(windowStart, index + 1);
    const average = window.reduce((sum, p) => sum + p.weight, 0) / window.length;
    return { weight: average, recordedAt: point.recordedAt };
  });
}

export interface TrendResult {
  hasTrend: boolean;
  kgPerWeek: number | null;
}

const MIN_DAYS_FOR_TREND = 14;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Só declara tendência com pelo menos 14 dias de dados, comparando a média
 * móvel de 7 dias mais recente com a de 7 dias atrás — evita que uma
 * pesagem isolada pareça uma tendência real.
 */
export function calculateTrend(points: WeightPoint[]): TrendResult {
  if (points.length === 0) return { hasTrend: false, kgPerWeek: null };

  const sorted = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const spanDays =
    (sorted[sorted.length - 1].recordedAt.getTime() - sorted[0].recordedAt.getTime()) / MS_PER_DAY;

  if (spanDays < MIN_DAYS_FOR_TREND) {
    return { hasTrend: false, kgPerWeek: null };
  }

  const movingAverages = calculateMovingAverage(sorted, 7);
  const latest = movingAverages[movingAverages.length - 1];
  const weekAgoTarget = new Date(latest.recordedAt.getTime() - 7 * MS_PER_DAY);
  const closest = findClosestPoint(movingAverages, weekAgoTarget)!;

  const kgPerWeek = latest.weight - closest.weight;
  return { hasTrend: true, kgPerWeek };
}

export function calculateProportionalCalories(
  baseCalories: number,
  baseAmount: number,
  actualAmount: number,
): number {
  if (baseAmount === 0) return 0;
  return Math.round((baseCalories / baseAmount) * actualAmount);
}
