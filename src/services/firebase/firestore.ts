import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type {
  BankDebt,
  BodyMeasurement,
  IncomeItemKind,
  CalorieEntry,
  Exercise,
  Food,
  FoodCategory,
  MealType,
  UserProfile,
  WaterEntry,
  WeightEntry,
} from '../../types';
import { toMonthKey, type MonthBill } from '../../utils/finance';
import { stableHash } from '../../utils/transactions';

/** Firestore rejeita campos com valor `undefined` — remove antes de gravar. */
function stripUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function userDoc(userId: string) {
  return doc(db, 'users', userId);
}

function userSubcollection(userId: string, name: string) {
  return collection(db, 'users', userId, name);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(userDoc(userId));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

export async function createUserProfile(
  userId: string,
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>,
): Promise<void> {
  await setDoc(userDoc(userId), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  userId: string,
  profile: Partial<Omit<UserProfile, 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(userDoc(userId), { ...profile, updatedAt: serverTimestamp() });
}

async function fetchEntries<T extends { id: string }>(
  userId: string,
  subcollectionName: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const q = query(
    userSubcollection(userId, subcollectionName),
    ...constraints,
    orderBy('recordedAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) })) as T[];
}

function sinceConstraint(since?: Date): QueryConstraint[] {
  return since ? [where('recordedAt', '>=', Timestamp.fromDate(since))] : [];
}

function updateEntry(
  userId: string,
  subcollectionName: string,
  entryId: string,
  data: Record<string, unknown>,
) {
  return updateDoc(doc(db, 'users', userId, subcollectionName, entryId), stripUndefined(data));
}

function deleteEntry(userId: string, subcollectionName: string, entryId: string) {
  return deleteDoc(doc(db, 'users', userId, subcollectionName, entryId));
}

// Peso
export async function addWeightEntry(userId: string, weight: number, recordedAt: Date) {
  await addDoc(userSubcollection(userId, 'weightEntries'), {
    weight,
    recordedAt: Timestamp.fromDate(recordedAt),
    createdAt: serverTimestamp(),
  });
}

export function getWeightEntries(userId: string, since?: Date) {
  return fetchEntries<WeightEntry>(userId, 'weightEntries', sinceConstraint(since));
}

export function updateWeightEntry(userId: string, entryId: string, data: Partial<{ weight: number }>) {
  return updateEntry(userId, 'weightEntries', entryId, data);
}

export function deleteWeightEntry(userId: string, entryId: string) {
  return deleteEntry(userId, 'weightEntries', entryId);
}

// Água
export async function addWaterEntry(userId: string, amountMl: number, recordedAt: Date) {
  await addDoc(userSubcollection(userId, 'waterEntries'), {
    amountMl,
    recordedAt: Timestamp.fromDate(recordedAt),
    createdAt: serverTimestamp(),
  });
}

export function getWaterEntries(userId: string, since?: Date) {
  return fetchEntries<WaterEntry>(userId, 'waterEntries', sinceConstraint(since));
}

export function updateWaterEntry(userId: string, entryId: string, data: Partial<{ amountMl: number }>) {
  return updateEntry(userId, 'waterEntries', entryId, data);
}

export function deleteWaterEntry(userId: string, entryId: string) {
  return deleteEntry(userId, 'waterEntries', entryId);
}

// Calorias
export async function addCalorieEntry(
  userId: string,
  data: { calories: number; mealType?: MealType; mealName?: string; notes?: string },
  recordedAt: Date,
) {
  await addDoc(userSubcollection(userId, 'calorieEntries'), {
    ...stripUndefined(data),
    recordedAt: Timestamp.fromDate(recordedAt),
    createdAt: serverTimestamp(),
  });
}

export function getCalorieEntries(userId: string, since?: Date) {
  return fetchEntries<CalorieEntry>(userId, 'calorieEntries', sinceConstraint(since));
}

export async function updateCalorieEntry(
  userId: string,
  entryId: string,
  data: Partial<{
    calories: number;
    /** `null` remove o campo opcional; `undefined` o deixa inalterado. */
    mealType: MealType | null;
    mealName: string | null;
  }>,
) {
  const { mealType, mealName, ...rest } = data;
  await updateDoc(doc(db, 'users', userId, 'calorieEntries', entryId), {
    ...stripUndefined(rest),
    ...(mealType !== undefined ? { mealType: mealType ?? deleteField() } : {}),
    ...(mealName !== undefined ? { mealName: mealName ?? deleteField() } : {}),
  });
}

export function deleteCalorieEntry(userId: string, entryId: string) {
  return deleteEntry(userId, 'calorieEntries', entryId);
}

// Medidas corporais
export async function addBodyMeasurement(
  userId: string,
  measurementType: string,
  value: number,
  recordedAt: Date,
) {
  await addDoc(userSubcollection(userId, 'bodyMeasurements'), {
    measurementType,
    value,
    recordedAt: Timestamp.fromDate(recordedAt),
    createdAt: serverTimestamp(),
  });
}

export function getBodyMeasurements(userId: string, since?: Date) {
  return fetchEntries<BodyMeasurement>(userId, 'bodyMeasurements', sinceConstraint(since));
}

// Exercícios
export async function addExercise(
  userId: string,
  data: { activity: string; durationMinutes: number; notes?: string },
  recordedAt: Date,
) {
  await addDoc(userSubcollection(userId, 'exercises'), {
    ...stripUndefined(data),
    recordedAt: Timestamp.fromDate(recordedAt),
    createdAt: serverTimestamp(),
  });
}

export function getExercises(userId: string, since?: Date) {
  return fetchEntries<Exercise>(userId, 'exercises', sinceConstraint(since));
}

export function updateExercise(
  userId: string,
  entryId: string,
  data: Partial<{ activity: string; durationMinutes: number }>,
) {
  return updateEntry(userId, 'exercises', entryId, data);
}

export function deleteExercise(userId: string, entryId: string) {
  return deleteEntry(userId, 'exercises', entryId);
}

// Alimentos favoritos
export async function addFood(
  userId: string,
  data: {
    name: string;
    calories: number;
    servingAmount: number;
    servingUnit: string;
    categoryId?: string;
  },
) {
  await addDoc(userSubcollection(userId, 'foods'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFood(
  userId: string,
  foodId: string,
  data: Partial<{
    name: string;
    calories: number;
    servingAmount: number;
    servingUnit: string;
    /** `null` remove a categoria (campo opcional); `undefined` a deixa inalterada. */
    categoryId: string | null;
  }>,
) {
  const { categoryId, ...rest } = data;
  await updateDoc(doc(db, 'users', userId, 'foods', foodId), {
    ...stripUndefined(rest),
    ...(categoryId !== undefined ? { categoryId: categoryId ?? deleteField() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFood(userId: string, foodId: string) {
  await deleteDoc(doc(db, 'users', userId, 'foods', foodId));
}

export async function getFoods(userId: string): Promise<Food[]> {
  const q = query(userSubcollection(userId, 'foods'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Food, 'id'>) }));
}

// Categorias de alimentos
export async function addFoodCategory(userId: string, data: { name: string; icon?: string }) {
  await addDoc(userSubcollection(userId, 'foodCategories'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFoodCategory(
  userId: string,
  categoryId: string,
  data: Partial<{ name: string; /** `null` remove o ícone (campo opcional); `undefined` o deixa inalterado. */ icon: string | null }>,
) {
  const { icon, ...rest } = data;
  await updateDoc(doc(db, 'users', userId, 'foodCategories', categoryId), {
    ...stripUndefined(rest),
    ...(icon !== undefined ? { icon: icon ?? deleteField() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFoodCategory(userId: string, categoryId: string) {
  await deleteDoc(doc(db, 'users', userId, 'foodCategories', categoryId));
}

export async function getFoodCategories(userId: string): Promise<FoodCategory[]> {
  const q = query(userSubcollection(userId, 'foodCategories'), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FoodCategory, 'id'>) }));
}

// Finanças — contas do mês
export async function addBill(userId: string, data: { name: string; amountCents: number; dueDate: Date }) {
  await addDoc(userSubcollection(userId, 'bills'), {
    name: data.name,
    amountCents: data.amountCents,
    dueDate: Timestamp.fromDate(data.dueDate),
    month: toMonthKey(data.dueDate),
    paid: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Grava alterações de uma conta do mês. Ocorrências de contas fixas ainda não
 * gravadas são criadas com id determinístico (`rec_{modelo}_{mês}`), o que
 * impede duplicatas mesmo com cliques repetidos ou vários dispositivos.
 */
export async function saveMonthBill(
  userId: string,
  bill: MonthBill,
  changes: Partial<{ name: string; amountCents: number; dueDate: Date; paid: boolean }>,
) {
  const ref = doc(db, 'users', userId, 'bills', bill.id);
  const { dueDate, paid, ...rest } = changes;
  // Contas fixas ficam presas ao mês de referência; contas avulsas acompanham o vencimento.
  const month = dueDate && !bill.recurringId ? toMonthKey(dueDate) : bill.month;

  if (bill.persisted) {
    await updateDoc(ref, {
      ...stripUndefined(rest),
      ...(dueDate ? { dueDate: Timestamp.fromDate(dueDate), month } : {}),
      ...(paid !== undefined ? { paid, paidAt: paid ? serverTimestamp() : deleteField() } : {}),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const isPaid = paid ?? bill.paid;
  await setDoc(ref, {
    name: rest.name ?? bill.name,
    amountCents: rest.amountCents ?? bill.amountCents,
    dueDate: Timestamp.fromDate(dueDate ?? bill.dueDate),
    month,
    paid: isPaid,
    ...(isPaid ? { paidAt: serverTimestamp() } : {}),
    ...(bill.recurringId ? { recurringId: bill.recurringId } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Remove a conta do mês. Para contas fixas grava um marcador `skipped`, para que ela não reapareça. */
export async function removeMonthBill(userId: string, bill: MonthBill) {
  const ref = doc(db, 'users', userId, 'bills', bill.id);
  if (!bill.recurringId) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, {
    name: bill.name,
    amountCents: bill.amountCents,
    dueDate: Timestamp.fromDate(bill.dueDate),
    month: bill.month,
    paid: false,
    recurringId: bill.recurringId,
    skipped: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Finanças — contas fixas
export async function addRecurringBill(
  userId: string,
  data: { name: string; amountCents: number; dueDay: number; startMonth: string; installments?: number },
) {
  await addDoc(userSubcollection(userId, 'recurringBills'), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateRecurringBill(
  userId: string,
  recurringId: string,
  data: Partial<{
    name: string;
    amountCents: number;
    dueDay: number;
    startMonth: string;
    /** `null` torna a conta fixa sem data de término; `undefined` a deixa inalterada. */
    installments: number | null;
  }>,
) {
  const { installments, ...rest } = data;
  await updateDoc(doc(db, 'users', userId, 'recurringBills', recurringId), {
    ...stripUndefined(rest),
    ...(installments !== undefined ? { installments: installments ?? deleteField() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecurringBill(userId: string, recurringId: string) {
  await deleteDoc(doc(db, 'users', userId, 'recurringBills', recurringId));
}

// Finanças — transações importadas (OFX)
export interface NewTransaction {
  id: string;
  date: Date;
  amountCents: number;
  description: string;
  descriptionKey: string;
  categoryId: string;
  categorySource: 'auto' | 'rule';
  accountKey: string;
  accountLabel: string;
  fitId: string;
}

/** Ids já gravados no intervalo — usado para não reimportar (e não sobrescrever categorias editadas). */
export async function getTransactionIdsBetween(userId: string, from: Date, to: Date): Promise<Set<string>> {
  const q = query(
    userSubcollection(userId, 'transactions'),
    where('date', '>=', Timestamp.fromDate(from)),
    where('date', '<=', Timestamp.fromDate(to)),
  );
  const snapshot = await getDocs(q);
  return new Set(snapshot.docs.map((d) => d.id));
}

const BATCH_LIMIT = 450;

async function commitInChunks<T>(items: T[], apply: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    items.slice(i, i + BATCH_LIMIT).forEach((item) => apply(batch, item));
    await batch.commit();
  }
}

export async function importTransactions(userId: string, transactions: NewTransaction[]) {
  await commitInChunks(transactions, (batch, { id, date, ...tx }) => {
    batch.set(doc(db, 'users', userId, 'transactions', id), {
      ...tx,
      date: Timestamp.fromDate(date),
      month: toMonthKey(date),
      importedAt: serverTimestamp(),
    });
  });
}

/**
 * Muda a categoria de uma transação. Com `applyToSimilar`, grava uma regra
 * para a descrição e recategoriza todas as transações iguais já importadas.
 */
export async function setTransactionCategory(
  userId: string,
  transactionId: string,
  descriptionKey: string,
  categoryId: string,
  applyToSimilar: boolean,
) {
  if (!applyToSimilar) {
    await updateDoc(doc(db, 'users', userId, 'transactions', transactionId), {
      categoryId,
      categorySource: 'manual',
    });
    return;
  }
  await setDoc(doc(db, 'users', userId, 'categoryRules', stableHash(descriptionKey)), {
    key: descriptionKey,
    categoryId,
    updatedAt: serverTimestamp(),
  });
  const similar = await getDocs(
    query(userSubcollection(userId, 'transactions'), where('descriptionKey', '==', descriptionKey)),
  );
  await commitInChunks(similar.docs, (batch, d) => {
    batch.update(d.ref, { categoryId, categorySource: d.id === transactionId ? 'manual' : 'rule' });
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
}

// Finanças — bancos e dívidas
export async function addBank(userId: string, data: { name: string; balanceCents: number }) {
  await addDoc(userSubcollection(userId, 'banks'), {
    ...data,
    debts: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBank(userId: string, bankId: string, data: Partial<{ name: string; balanceCents: number }>) {
  await updateDoc(doc(db, 'users', userId, 'banks', bankId), { ...stripUndefined(data), updatedAt: serverTimestamp() });
}

/** As dívidas ficam como lista dentro do banco; a lista inteira é regravada a cada alteração. */
export async function saveBankDebts(userId: string, bankId: string, debts: BankDebt[]) {
  await updateDoc(doc(db, 'users', userId, 'banks', bankId), {
    debts: debts.map((d) => stripUndefined(d)),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBank(userId: string, bankId: string) {
  await deleteDoc(doc(db, 'users', userId, 'banks', bankId));
}

// Finanças — renda fixa mensal
export async function addIncomeItem(
  userId: string,
  data: { kind: IncomeItemKind; name: string; amountCents: number; inCash?: boolean },
) {
  await addDoc(userSubcollection(userId, 'incomeItems'), { ...stripUndefined(data), createdAt: serverTimestamp() });
}

export async function updateIncomeItem(
  userId: string,
  itemId: string,
  data: Partial<{ name: string; amountCents: number; inCash: boolean }>,
) {
  await updateDoc(doc(db, 'users', userId, 'incomeItems', itemId), stripUndefined(data));
}

export async function deleteIncomeItem(userId: string, itemId: string) {
  await deleteDoc(doc(db, 'users', userId, 'incomeItems', itemId));
}

// Finanças — receitas avulsas
export async function addExtraIncome(userId: string, data: { description: string; amountCents: number; date: Date }) {
  await addDoc(userSubcollection(userId, 'extraIncomes'), {
    description: data.description,
    amountCents: data.amountCents,
    date: Timestamp.fromDate(data.date),
    month: toMonthKey(data.date),
    createdAt: serverTimestamp(),
  });
}

export async function updateExtraIncome(
  userId: string,
  incomeId: string,
  data: { description: string; amountCents: number; date: Date },
) {
  await updateDoc(doc(db, 'users', userId, 'extraIncomes', incomeId), {
    description: data.description,
    amountCents: data.amountCents,
    date: Timestamp.fromDate(data.date),
    month: toMonthKey(data.date),
  });
}

export async function deleteExtraIncome(userId: string, incomeId: string) {
  await deleteDoc(doc(db, 'users', userId, 'extraIncomes', incomeId));
}
