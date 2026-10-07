import type { Timestamp } from 'firebase/firestore';

export type Sex = 'male' | 'female';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface UserProfile {
  name: string;
  sex?: Sex;
  birthDate?: Timestamp | null;
  height?: number;
  initialWeight?: number;
  goalWeight?: number;
  activityLevel?: ActivityLevel;
  dailyCalorieGoal?: number;
  dailyWaterGoal?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

export interface FoodCategory {
  id: string;
  name: string;
  icon?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  servingAmount: number;
  servingUnit: string;
  categoryId?: string;
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

/**
 * Conta de um mês específico (módulo Finanças). Valores em centavos para
 * evitar erros de arredondamento de ponto flutuante.
 * Contas fixas só viram documento quando são alteradas, pagas ou removidas
 * naquele mês — até lá são exibidas a partir do modelo (`RecurringBill`).
 */
export interface Bill {
  id: string;
  name: string;
  amountCents: number;
  dueDate: Timestamp;
  /** Mês de referência no formato `YYYY-MM`. */
  month: string;
  paid: boolean;
  paidAt?: Timestamp;
  recurringId?: string;
  /** Ocorrência de conta fixa removida apenas deste mês. */
  skipped?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Modelo de conta fixa mensal (ou parcelada, quando `installments` existe). */
export interface RecurringBill {
  id: string;
  name: string;
  amountCents: number;
  dueDay: number;
  /** Primeiro mês em que a conta aparece, `YYYY-MM`. */
  startMonth: string;
  installments?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Movimentação importada de extrato bancário (OFX). Saídas têm valor negativo. */
export interface Transaction {
  id: string;
  date: Timestamp;
  /** Mês de referência no formato `YYYY-MM`. */
  month: string;
  amountCents: number;
  description: string;
  /** Descrição normalizada — chave das regras de categoria aprendidas. */
  descriptionKey: string;
  categoryId: string;
  categorySource: 'auto' | 'rule' | 'manual';
  accountKey: string;
  accountLabel: string;
  fitId: string;
  importedAt: Timestamp;
}

/** Regra aprendida: transações com esta descrição normalizada vão para a categoria. */
export interface CategoryRule {
  id: string;
  key: string;
  categoryId: string;
}

export const DEBT_KINDS = ['cartao', 'cheque_especial', 'emprestimo', 'financiamento', 'outro'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

/** Dívida com um banco. Fica dentro do documento do banco (poucos itens por banco). */
export interface BankDebt {
  id: string;
  kind: DebtKind;
  description?: string;
  /** Quanto falta pagar hoje (saldo devedor / valor para quitação). */
  balanceCents: number;
  monthlyPaymentCents?: number;
  installmentsLeft?: number;
  /** Juros ao mês, em % (ex.: 12.5). */
  interestRateMonthly?: number;
  /**
   * `true` quando a parcela já aparece em Contas a pagar ou é descontada do
   * salário — evita contá-la duas vezes na previsão do mês.
   */
  paymentTracked?: boolean;
}

export interface Bank {
  id: string;
  name: string;
  /** Dinheiro guardado no banco (conta + investimentos). */
  balanceCents: number;
  debts: BankDebt[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type IncomeItemKind = 'salary' | 'benefit' | 'deduction';

/** Item fixo da renda mensal: salário bruto, benefício ou desconto em folha. */
export interface IncomeItem {
  id: string;
  kind: IncomeItemKind;
  name: string;
  amountCents: number;
  /** Benefícios: `false` para cartões como VR/VA, que não viram dinheiro em conta. */
  inCash?: boolean;
  createdAt: Timestamp;
}

/** Receita avulsa (venda, freela, reembolso...). */
export interface ExtraIncome {
  id: string;
  description: string;
  amountCents: number;
  date: Timestamp;
  month: string;
  createdAt: Timestamp;
}
