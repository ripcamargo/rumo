import {
  addDoc,
  collection,
  deleteDoc,
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
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import type {
  BodyMeasurement,
  CalorieEntry,
  Exercise,
  Food,
  UserProfile,
  WaterEntry,
  WeightEntry,
} from '../../types';

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

// Calorias
export async function addCalorieEntry(
  userId: string,
  data: { calories: number; mealName?: string; notes?: string },
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

// Alimentos favoritos
export async function addFood(
  userId: string,
  data: { name: string; calories: number; servingAmount: number; servingUnit: string },
) {
  await addDoc(userSubcollection(userId, 'foods'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateFood(
  userId: string,
  foodId: string,
  data: Partial<{ name: string; calories: number; servingAmount: number; servingUnit: string }>,
) {
  await updateDoc(doc(db, 'users', userId, 'foods', foodId), {
    ...stripUndefined(data),
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
