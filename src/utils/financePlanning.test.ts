import { describe, expect, it } from 'vitest';
import {
  buildInsights,
  projectNetWorth,
  requiredMonthlyBudget,
  simulatePayoff,
  suggestSurplusSplit,
  summarizeIncome,
  untrackedPaymentsCents,
} from './financePlanning';
import type { BankDebt } from '../types';

const debt = (data: Partial<BankDebt> & Pick<BankDebt, 'id' | 'balanceCents'>): BankDebt => ({ kind: 'outro', ...data });

describe('renda', () => {
  it('calcula líquido total e líquido em conta', () => {
    const summary = summarizeIncome([
      { kind: 'salary', amountCents: 500000 },
      { kind: 'benefit', amountCents: 80000, inCash: false },
      { kind: 'benefit', amountCents: 20000 },
      { kind: 'deduction', amountCents: 110000 },
    ]);
    expect(summary).toEqual({
      grossCents: 500000,
      benefitsCents: 100000,
      nonCashBenefitsCents: 80000,
      deductionsCents: 110000,
      netCents: 490000,
      netCashCents: 410000,
    });
  });
});

describe('simulação de quitação', () => {
  it('parcelado fixo termina no número de parcelas', () => {
    const result = simulatePayoff([debt({ id: 'a', balanceCents: 30000, monthlyPaymentCents: 10000, installmentsLeft: 3 })], 10000);
    expect(result.months).toBe(3);
    expect(result.totalInterestCents).toBe(0);
  });

  it('aplica juros e prioriza a dívida mais cara (avalanche)', () => {
    const debts = [
      debt({ id: 'barata', balanceCents: 100000, interestRateMonthly: 1, monthlyPaymentCents: 10000 }),
      debt({ id: 'cara', balanceCents: 100000, interestRateMonthly: 10 }),
    ];
    const result = simulatePayoff(debts, 60000);
    expect(result.payoffMonthById.cara).toBeLessThan(result.payoffMonthById.barata as number);
    expect(result.totalInterestCents).toBeGreaterThan(0);
  });

  it('não quita dívida com juros e sem pagamento', () => {
    expect(simulatePayoff([debt({ id: 'a', balanceCents: 100000, interestRateMonthly: 5 })], 0, 24).months).toBeNull();
  });

  it('acha o orçamento mensal para quitar no prazo', () => {
    const debts = [debt({ id: 'a', balanceCents: 120000 })];
    expect(requiredMonthlyBudget(debts, 12)).toBe(10000);
    const withInterest = [debt({ id: 'a', balanceCents: 120000, interestRateMonthly: 3 })];
    const budget = requiredMonthlyBudget(withInterest, 12);
    expect(budget).toBeGreaterThan(10000);
    expect(simulatePayoff(withInterest, budget, 12).months).toBeLessThanOrEqual(12);
  });
});

describe('projeção', () => {
  it('direciona a sobra para dívidas e depois para o guardado', () => {
    const points = projectNetWorth(50000, [debt({ id: 'a', balanceCents: 20000 })], 10000, 4);
    expect(points.map((p) => p.debtCents)).toEqual([20000, 10000, 0, 0, 0]);
    expect(points.map((p) => p.savedCents)).toEqual([50000, 50000, 50000, 60000, 70000]);
  });

  it('déficit consome o guardado', () => {
    const points = projectNetWorth(30000, [], -10000, 2);
    expect(points.map((p) => p.savedCents)).toEqual([30000, 20000, 10000]);
  });
});

describe('dicas e sugestões', () => {
  it('soma só parcelas não lançadas em contas', () => {
    expect(
      untrackedPaymentsCents([
        debt({ id: 'a', balanceCents: 1, monthlyPaymentCents: 500, paymentTracked: false }),
        debt({ id: 'b', balanceCents: 1, monthlyPaymentCents: 700, paymentTracked: true }),
      ]),
    ).toBe(500);
  });

  it('alerta para déficit, dívida cara e reserva baixa', () => {
    const insights = buildInsights({
      incomeNetCashCents: 400000,
      surplusCents: -5000,
      billsTotalCents: 405000,
      overdueBills: 0,
      savedCents: 100000,
      debts: [{ id: 'c', kind: 'cartao', balanceCents: 200000, interestRateMonthly: 12, bankId: 'b', bankName: 'Itaú' }],
      monthlyCostCents: 400000,
      categoryAlerts: [],
    });
    expect(insights.map((i) => i.icon)).toEqual(['🚨', '🔥', '🛟', '📊']);
    expect(insights[1].text).toMatch(/R\$\s240,00/);
  });

  it('divide a sobra conforme a situação', () => {
    expect(suggestSurplusSplit(100000, true, 2)).toEqual({ debtsCents: 70000, reserveCents: 10000, freeCents: 20000 });
    expect(suggestSurplusSplit(100000, false, 1)).toEqual({ debtsCents: 0, reserveCents: 60000, freeCents: 40000 });
    expect(suggestSurplusSplit(-1, true, 0)).toEqual({ debtsCents: 0, reserveCents: 0, freeCents: 0 });
  });
});
