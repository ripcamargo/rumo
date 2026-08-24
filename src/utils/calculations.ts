export interface WeightPoint {
  weight: number;
  recordedAt: Date;
}

export type BmiClassification =
  | 'abaixo do peso'
  | 'saudável'
  | 'sobrepeso'
  | 'obesidade grau I'
  | 'obesidade grau II'
  | 'obesidade grau III';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export type Sex = 'male' | 'female';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export const DEFAULT_CALORIE_DEFICIT = 500;
export const MIN_DAILY_CALORIE_GOAL = 1200;
export const HEALTHY_BMI_TOP = 24.9;

function isValidNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function calculateAge(birthDate: Date | null | undefined, now = new Date()): number {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) return 0;

  let age = now.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age < 0 ? 0 : age;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  if (!isValidNumber(weightKg) || !isValidNumber(heightCm)) return 0;
  const heightMeters = heightCm / 100;
  if (heightMeters <= 0) return 0;
  return weightKg / (heightMeters * heightMeters);
}

export function classifyBmi(bmi: number): BmiClassification {
  if (!Number.isFinite(bmi) || bmi <= 0) return 'abaixo do peso';
  if (bmi < 18.5) return 'abaixo do peso';
  if (bmi < 25) return 'saudável';
  if (bmi < 30) return 'sobrepeso';
  if (bmi < 35) return 'obesidade grau I';
  if (bmi < 40) return 'obesidade grau II';
  return 'obesidade grau III';
}

export function calculateReferenceWeight(heightCm: number): number {
  if (!isValidNumber(heightCm)) return 0;
  const heightMeters = heightCm / 100;
  return Number((HEALTHY_BMI_TOP * heightMeters * heightMeters).toFixed(1));
}

export function calculateMifflinStJeor({
  sex,
  weightKg,
  heightCm,
  ageYears,
}: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  if (!isValidNumber(weightKg) || !isValidNumber(heightCm) || !Number.isFinite(ageYears) || ageYears < 0) {
    return 0;
  }

  if (sex === 'male') {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5);
  }

  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161);
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  if (!Number.isFinite(bmr) || bmr <= 0) return 0;
  const factor = ACTIVITY_FACTORS[activityLevel] ?? ACTIVITY_FACTORS.moderately_active;
  return Math.round(bmr * factor);
}

export function calculateCalorieGoal(
  tdee: number,
  deficitKcal = DEFAULT_CALORIE_DEFICIT,
  minimum = MIN_DAILY_CALORIE_GOAL,
): number {
  if (!Number.isFinite(tdee) || tdee <= 0) return minimum;
  return Math.max(Math.round(tdee - deficitKcal), minimum);
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

export function calculateGoalProgress(
  initialWeight: number,
  currentWeight: number | null,
  goalWeight: number,
): number {
  if (!isValidNumber(initialWeight) || !isValidNumber(goalWeight)) return 0;
  if (currentWeight === null || !isValidNumber(currentWeight)) return 0;

  const totalToLose = initialWeight - goalWeight;
  if (totalToLose === 0) {
    return currentWeight <= goalWeight ? 1 : 0;
  }

  const progress = (initialWeight - currentWeight) / totalToLose;
  return Math.min(Math.max(progress, 0), 1);
}

export function estimateWeeksToGoal(
  currentWeight: number,
  goalWeight: number,
  kgPerWeek: number | null,
): number | null {
  if (!isValidNumber(currentWeight) || !isValidNumber(goalWeight) || kgPerWeek === null) return null;
  if (Math.abs(kgPerWeek) < 0.05) return null;
  if (currentWeight <= goalWeight) return 0;
  const remaining = currentWeight - goalWeight;
  return remaining / Math.abs(kgPerWeek);
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

export function calculateTrend(points: WeightPoint[]): TrendResult {
  if (points.length < 2) return { hasTrend: false, kgPerWeek: null };

  const sorted = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const spanDays =
    (sorted[sorted.length - 1].recordedAt.getTime() - sorted[0].recordedAt.getTime()) / MS_PER_DAY;

  if (spanDays < MIN_DAYS_FOR_TREND) {
    return { hasTrend: false, kgPerWeek: null };
  }

  const movingAverages = calculateMovingAverage(sorted, 7);
  if (movingAverages.length < 2) return { hasTrend: false, kgPerWeek: null };

  const latest = movingAverages[movingAverages.length - 1];
  const weekAgoTarget = new Date(latest.recordedAt.getTime() - 7 * MS_PER_DAY);
  const previous = findClosestPoint(movingAverages, weekAgoTarget);
  if (!previous) {
    return { hasTrend: false, kgPerWeek: null };
  }

  const kgPerWeek = ((latest.weight - previous.weight) / Math.max((latest.recordedAt.getTime() - previous.recordedAt.getTime()) / MS_PER_DAY, 1)) * 7;
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
