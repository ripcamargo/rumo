import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  addMonths,
  buildMonthBills,
  dueDateFor,
  getDueStatus,
  isRecurringActiveIn,
  monthDiff,
  parseCurrencyInput,
  recurringBillDocId,
  summarizeBills,
} from './finance';
import type { Bill, RecurringBill } from '../types';

const ts = Timestamp.fromDate(new Date('2026-01-01T12:00:00'));

function template(data: Partial<RecurringBill> & Pick<RecurringBill, 'id' | 'name'>): RecurringBill {
  return { amountCents: 10000, dueDay: 10, startMonth: '2026-07', createdAt: ts, updatedAt: ts, ...data };
}

function bill(data: Partial<Bill> & Pick<Bill, 'id' | 'name' | 'month'>): Bill {
  return {
    amountCents: 5000,
    dueDate: Timestamp.fromDate(new Date(`${data.month}-05T12:00:00`)),
    paid: false,
    createdAt: ts,
    updatedAt: ts,
    ...data,
  };
}

describe('meses', () => {
  it('soma e subtrai meses atravessando o ano', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthDiff('2026-07', '2027-06')).toBe(11);
  });

  it('ajusta o vencimento para o último dia de meses mais curtos', () => {
    expect(dueDateFor('2027-02', 31).getDate()).toBe(28);
    expect(dueDateFor('2026-10', 15).getDate()).toBe(15);
  });
});

describe('parseCurrencyInput', () => {
  it('aceita formatos comuns em reais', () => {
    expect(parseCurrencyInput('169')).toBe(16900);
    expect(parseCurrencyInput('180,90')).toBe(18090);
    expect(parseCurrencyInput('180.90')).toBe(18090);
    expect(parseCurrencyInput('R$ 1.234,56')).toBe(123456);
    expect(parseCurrencyInput('1.234')).toBe(123400);
  });

  it('rejeita valores inválidos ou zerados', () => {
    expect(parseCurrencyInput('')).toBeNull();
    expect(parseCurrencyInput('abc')).toBeNull();
    expect(parseCurrencyInput('0')).toBeNull();
    expect(parseCurrencyInput('10,999')).toBeNull();
  });
});

describe('contas fixas', () => {
  it('respeita início e número de parcelas', () => {
    const parcelada = { startMonth: '2026-07', installments: 3 };
    expect(isRecurringActiveIn(parcelada, '2026-06')).toBe(false);
    expect(isRecurringActiveIn(parcelada, '2026-09')).toBe(true);
    expect(isRecurringActiveIn(parcelada, '2026-10')).toBe(false);
    expect(isRecurringActiveIn({ startMonth: '2026-07' }, '2030-01')).toBe(true);
  });

  it('mescla contas gravadas com ocorrências de contas fixas', () => {
    const templates = [
      template({ id: 'tim', name: 'Tim', dueDay: 15 }),
      template({ id: 'iphone', name: 'iPhone', dueDay: 8, installments: 12 }),
      template({ id: 'luz', name: 'Luz', dueDay: 3 }),
    ];
    const bills = [
      bill({ id: recurringBillDocId('tim', '2026-09'), name: 'Tim', month: '2026-09', recurringId: 'tim', paid: true,
        dueDate: Timestamp.fromDate(new Date('2026-09-15T12:00:00')) }),
      bill({ id: recurringBillDocId('luz', '2026-09'), name: 'Luz', month: '2026-09', recurringId: 'luz', skipped: true }),
      bill({ id: 'irpf', name: 'IRPF', month: '2026-09' }),
    ];

    const result = buildMonthBills('2026-09', bills, templates);

    expect(result.map((b) => b.name)).toEqual(['IRPF', 'iPhone', 'Tim']);
    expect(result.find((b) => b.name === 'iPhone')).toMatchObject({ persisted: false, installmentLabel: '3/12' });
    expect(result.find((b) => b.name === 'Tim')).toMatchObject({ persisted: true, paid: true });
  });
});

describe('resumo e status', () => {
  const today = new Date('2026-09-10T09:00:00');

  it('calcula total, pago, restante e vencidas', () => {
    const bills = buildMonthBills(
      '2026-09',
      [
        bill({ id: 'a', name: 'A', month: '2026-09', amountCents: 7000, paid: true }),
        bill({ id: 'b', name: 'B', month: '2026-09', amountCents: 16900 }),
      ],
      [template({ id: 'c', name: 'C', amountCents: 10000, dueDay: 20 })],
    );
    expect(summarizeBills(bills, today)).toEqual({
      totalCents: 33900,
      paidCents: 7000,
      remainingCents: 26900,
      paidCount: 1,
      overdueCount: 1,
    });
  });

  it('classifica o vencimento em relação a hoje', () => {
    const due = (d: string) => ({ paid: false, dueDate: new Date(`${d}T12:00:00`) });
    expect(getDueStatus(due('2026-09-08'), today)).toEqual({ kind: 'overdue', label: 'Vencida há 2 dias' });
    expect(getDueStatus(due('2026-09-10'), today).kind).toBe('today');
    expect(getDueStatus(due('2026-09-13'), today)).toEqual({ kind: 'soon', label: 'Vence em 3 dias' });
    expect(getDueStatus(due('2026-09-30'), today).kind).toBe('upcoming');
    expect(getDueStatus({ ...due('2026-09-01'), paid: true }, today).kind).toBe('paid');
  });
});
