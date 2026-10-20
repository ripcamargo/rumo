import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { buildFinanceReport } from './financeReport';
import type { FinanceData } from './financeOverview';
import type { Bank, IncomeItem, RecurringBill, Transaction } from '../types';

const ts = (iso: string) => Timestamp.fromDate(new Date(`${iso}T12:00:00`));

const tx = (id: string, date: string, amountCents: number, description: string, categoryId: string): Transaction => ({
  id,
  date: ts(date),
  month: date.slice(0, 7),
  amountCents,
  description,
  descriptionKey: description.toLowerCase(),
  categoryId,
  categorySource: 'auto',
  accountKey: 'itau',
  accountLabel: 'Itaú',
  fitId: id,
  importedAt: ts(date),
});

const data: FinanceData = {
  banks: [
    {
      id: 'b1',
      name: 'Itaú',
      balanceCents: 150000,
      debts: [{ id: 'd1', kind: 'cartao', balanceCents: 300000, monthlyPaymentCents: 50000, interestRateMonthly: 12 }],
    } as Bank,
  ],
  incomeItems: [
    { id: 'i1', kind: 'salary', name: 'Salário', amountCents: 500000 } as IncomeItem,
    { id: 'i2', kind: 'benefit', name: 'VR', amountCents: 80000, inCash: false } as IncomeItem,
  ],
  extraIncomes: [],
  bills: [],
  recurringBills: [
    { id: 'r1', name: 'Aluguel', amountCents: 150000, payee: 'João', dueDay: 5, startMonth: '2026-01' } as RecurringBill,
  ],
  transactions: [
    tx('t1', '2026-10-03', -4500, 'UBER TRIP', 'transporte'),
    tx('t2', '2026-10-04', -32000, 'MERCADO EXTRA', 'mercado'),
    tx('t3', '2026-10-05', 500000, 'SALARIO', 'receitas'),
  ],
};

describe('relatório financeiro', () => {
  const report = buildFinanceReport(data, '2026-10', new Date('2026-10-20T12:00:00'));

  it('inclui renda, bancos, dívidas, contas e extratos', () => {
    expect(report).toContain('Salário: R$');
    expect(report).toContain('(não cai na conta, ex.: VR/VA)');
    expect(report).toContain('### Itaú');
    expect(report).toContain('Dívida "Cartão de crédito"');
    expect(report).toContain('- Aluguel: R$');
    expect(report).toContain('para João');
    expect(report).toContain('UBER TRIP');
    expect(report).toMatch(/Mercado: R\$\s?320,00 \(88%/);
  });
});
