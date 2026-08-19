import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  name: string;
  height: number;
  initialWeight: number;
  goalWeight: number;
  dailyCalorieGoal: number;
  dailyWaterGoal: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WeightEntry {
  id: string;
  weight: number;
  recordedAt: Timestamp;
  createdAt: Timestamp;
}

export interface WaterEntry {
  id: string;
  amountMl: number;
  recordedAt: Timestamp;
  createdAt: Timestamp;
}

export const MEAL_TYPES = ['cafe_manha', 'almoco', 'cafe_tarde', 'jantar'] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export interface CalorieEntry {
  id: string;
  calories: number;
  mealType?: MealType;
  mealName?: string;
  notes?: string;
  recordedAt: Timestamp;
  createdAt: Timestamp;
}

export const MEASUREMENT_TYPES = [
  'cintura',
  'abdomen',
  'peito',
  'quadril',
  'braco',
  'coxa',
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export interface BodyMeasurement {
  id: string;
  measurementType: MeasurementType;
  value: number;
  recordedAt: Timestamp;
  createdAt: Timestamp;
}

export interface Exercise {
  id: string;
  activity: string;
  durationMinutes: number;
  notes?: string;
  recordedAt: Timestamp;
  createdAt: Timestamp;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  servingAmount: number;
  servingUnit: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DailySummary {
  caloriesConsumed: number;
  caloriesGoal: number;
  caloriesRemaining: number;
  waterConsumedMl: number;
  waterGoalMl: number;
  exercisesToday: Exercise[];
}

export type HistoryRangeFilter = 7 | 30 | 90 | 'all';
