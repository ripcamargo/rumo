import type { MealType, MeasurementType } from '../types';

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  cintura: 'Cintura',
  abdomen: 'Abdômen',
  peito: 'Peito',
  quadril: 'Quadril',
  braco: 'Braço',
  coxa: 'Coxa',
};

export function measurementLabel(type: MeasurementType): string {
  return MEASUREMENT_LABELS[type];
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  cafe_manha: 'Café da manhã',
  almoco: 'Almoço',
  cafe_tarde: 'Café da tarde',
  jantar: 'Jantar',
};

export function mealTypeLabel(type: MealType): string {
  return MEAL_TYPE_LABELS[type];
}

/** Sugere a refeição mais provável com base na hora do dia, para pré-selecionar o combobox. */
export function defaultMealTypeForHour(hour: number): MealType {
  if (hour < 10) return 'cafe_manha';
  if (hour < 15) return 'almoco';
  if (hour < 18) return 'cafe_tarde';
  return 'jantar';
}
