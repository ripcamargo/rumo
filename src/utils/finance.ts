import type { Bill, RecurringBill } from '../types';

/** Conta exibida na lista do mês — pode vir de um documento ou de um modelo de conta fixa. */
export interface MonthBill {
  /** Id do documento em `bills` (para contas fixas ainda não gravadas, o id determinístico que será usado). */
  id: string;
  name: string;
  amountCents: number;
  dueDate: Date;
  month: string;
  paid: boolean;
  recurringId?: string;
  /** Ex.: "3/12" para contas parceladas. */
  installmentLabel?: string;
  /** `false` quando a conta ainda só existe como modelo de conta fixa. */
  persisted: boolean;
}

// Meses (`YYYY-MM`)

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(key: string): { year: number; monthIndex: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}

export function addMonths(key: string, months: number): string {
  const { year, monthIndex } = parseMonthKey(key);
  return toMonthKey(new Date(year, monthIndex + months, 1));
}

/** Quantidade de meses de `from` até `to` (negativo se `to` for anterior). */
export function monthDiff(from: string, to: string): number {
  const a = parseMonthKey(from);
  const b = parseMonthKey(to);
  return (b.year - a.year) * 12 + (b.monthIndex - a.monthIndex);
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const SHORT_MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });

export function formatMonthLabel(key: string): string {
  const { year, monthIndex } = parseMonthKey(key);
  const label = MONTH_LABEL_FORMATTER.format(new Date(year, monthIndex, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortMonthLabel(key: string): string {
  const { year, monthIndex } = parseMonthKey(key);
  return SHORT_MONTH_LABEL_FORMATTER.format(new Date(year, monthIndex, 1)).replace('.', '');
}

function daysInMonth(key: string): number {
  const { year, monthIndex } = parseMonthKey(key);
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Data de vencimento no mês, ajustando dias inexistentes (ex.: dia 31 em fevereiro → 28/29). Meio-dia evita bordas de fuso. */
export function dueDateFor(key: string, dueDay: number): Date {
  const { year, monthIndex } = parseMonthKey(key);
  return new Date(year, monthIndex, Math.min(dueDay, daysInMonth(key)), 12);
}

export function firstDayOfMonthInput(key: string): string {
  return `${key}-01`;
}

export function lastDayOfMonthInput(key: string): string {
  return `${key}-${String(daysInMonth(key)).padStart(2, '0')}`;
}

// Datas para `<input type="date">`

export function toDateInputValue(date: Date): string {
  return `${toMonthKey(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

export function fromDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
}

// Valores

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(cents: number): string {
  return CURRENCY_FORMATTER.format(cents / 100);
}

/** Valor para preencher um campo de edição: 16900 → "169,00". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Converte o texto digitado em centavos. Aceita "169", "169,9", "1.234,56",
 * "R$ 98,00" e também ponto como separador decimal ("180.90").
 */
export function parseCurrencyInput(input: string): number | null {
  let value = input.replace(/[R$\s]/g, '');
  if (!value) return null;
  if (value.includes(',')) {
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return cents > 0 ? cents : null;
}

// Contas fixas

export function recurringBillDocId(recurringId: string, month: string): string {
  return `rec_${recurringId}_${month}`;
}

export function recurringEndMonth(template: Pick<RecurringBill, 'startMonth' | 'installments'>): string | null {
  return template.installments ? addMonths(template.startMonth, template.installments - 1) : null;
}

export function isRecurringActiveIn(
  template: Pick<RecurringBill, 'startMonth' | 'installments'>,
  month: string,
): boolean {
  if (monthDiff(template.startMonth, month) < 0) return false;
  const end = recurringEndMonth(template);
  return !end || monthDiff(month, end) >= 0;
}

function installmentLabel(template: RecurringBill | undefined, month: string): string | undefined {
  if (!template?.installments) return undefined;
  return `${monthDiff(template.startMonth, month) + 1}/${template.installments}`;
}

/**
 * Junta as contas gravadas do mês com as ocorrências das contas fixas que
 * ainda não foram gravadas, ordenadas por vencimento.
 */
export function buildMonthBills(month: string, bills: Bill[], templates: RecurringBill[]): MonthBill[] {
  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const monthBills = bills.filter((b) => b.month === month);
  const materializedRecurring = new Set(
    monthBills.filter((b) => b.recurringId).map((b) => b.recurringId as string),
  );

  const persisted: MonthBill[] = monthBills
    .filter((b) => !b.skipped)
    .map((b) => ({
      id: b.id,
      name: b.name,
      amountCents: b.amountCents,
      dueDate: b.dueDate.toDate(),
      month: b.month,
      paid: b.paid,
      recurringId: b.recurringId,
      installmentLabel: installmentLabel(templatesById.get(b.recurringId ?? ''), month),
      persisted: true,
    }));

  const virtual: MonthBill[] = templates
    .filter((t) => isRecurringActiveIn(t, month) && !materializedRecurring.has(t.id))
    .map((t) => ({
      id: recurringBillDocId(t.id, month),
      name: t.name,
      amountCents: t.amountCents,
      dueDate: dueDateFor(month, t.dueDay),
      month,
      paid: false,
      recurringId: t.id,
      installmentLabel: installmentLabel(t, month),
      persisted: false,
    }));

  return [...persisted, ...virtual].sort(
    (a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.name.localeCompare(b.name, 'pt-BR'),
  );
}

export interface MonthSummary {
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  paidCount: number;
  overdueCount: number;
}

export function summarizeBills(bills: MonthBill[], today: Date = new Date()): MonthSummary {
  const summary: MonthSummary = { totalCents: 0, paidCents: 0, remainingCents: 0, paidCount: 0, overdueCount: 0 };
  for (const bill of bills) {
    summary.totalCents += bill.amountCents;
    if (bill.paid) {
      summary.paidCents += bill.amountCents;
      summary.paidCount += 1;
    } else {
      summary.remainingCents += bill.amountCents;
      if (daysUntil(bill.dueDate, today) < 0) summary.overdueCount += 1;
    }
  }
  return summary;
}

function daysUntil(date: Date, today: Date): number {
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type DueStatusKind = 'paid' | 'overdue' | 'today' | 'soon' | 'upcoming';

export function getDueStatus(bill: Pick<MonthBill, 'paid' | 'dueDate'>, today: Date = new Date()): {
  kind: DueStatusKind;
  label: string;
} {
  if (bill.paid) return { kind: 'paid', label: 'Pago' };
  const days = daysUntil(bill.dueDate, today);
  if (days < 0) return { kind: 'overdue', label: days === -1 ? 'Venceu ontem' : `Vencida há ${-days} dias` };
  if (days === 0) return { kind: 'today', label: 'Vence hoje' };
  if (days === 1) return { kind: 'soon', label: 'Vence amanhã' };
  if (days <= 5) return { kind: 'soon', label: `Vence em ${days} dias` };
  return { kind: 'upcoming', label: '' };
}
