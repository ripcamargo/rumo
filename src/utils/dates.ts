import { Timestamp } from 'firebase/firestore';

export function getStartOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function getEndOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDaysAgo(days: number): Date {
  const d = getStartOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Início do dia seguinte — limite superior exclusivo útil para consultas por dia. */
export function getStartOfNextDay(date: Date): Date {
  return addDays(getStartOfDay(date), 1);
}

/**
 * Combina o dia (ano/mês/dia) de `day` com a hora atual do relógio.
 * Usado para registrar um evento em um dia passado sem perder a
 * ordenação natural por horário dentro do próprio dia.
 */
export function combineDayWithCurrentTime(day: Date): Date {
  const now = new Date();
  const combined = new Date(day);
  combined.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return combined;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export function timestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });

export function formatDate(date: Date): string {
  const weekday = WEEKDAY_FORMATTER.format(date);
  const dayMonth = DAY_MONTH_FORMATTER.format(date);
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday}, ${dayMonth}`;
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
