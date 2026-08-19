import type { FoodCategory, MealType, MeasurementType } from '../types';

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

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  frutas: 'Frutas',
  legumes_verduras: 'Legumes/Verduras',
  comida: 'Comida',
  fast_food: 'Fast-food',
  bebidas: 'Bebidas',
  laticinios: 'Laticínios',
  proteinas_carnes: 'Proteínas/Carnes',
  graos_cereais: 'Grãos/Cereais',
  doces_sobremesas: 'Doces/Sobremesas',
  snacks_petiscos: 'Snacks/Petiscos',
};

const FOOD_CATEGORY_ICONS: Record<FoodCategory, string> = {
  frutas: '🍎',
  legumes_verduras: '🥦',
  comida: '🍽️',
  fast_food: '🍔',
  bebidas: '🥤',
  laticinios: '🧀',
  proteinas_carnes: '🍗',
  graos_cereais: '🌾',
  doces_sobremesas: '🍰',
  snacks_petiscos: '🍿',
};

export function foodCategoryLabel(category: FoodCategory): string {
  return FOOD_CATEGORY_LABELS[category];
}

export function foodCategoryIcon(category: FoodCategory): string {
  return FOOD_CATEGORY_ICONS[category];
}
