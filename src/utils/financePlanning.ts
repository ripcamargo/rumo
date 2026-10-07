import type { Bank, BankDebt, DebtKind, IncomeItem, IncomeItemKind } from '../types';
import { formatCurrency } from './finance';

export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  cartao: 'Cartão de crédito',
  cheque_especial: 'Cheque especial / limite',
  emprestimo: 'Empréstimo / consignado',
  financiamento: 'Financiamento',
  outro: 'Outra dívida',
};

export function debtLabel(debt: Pick<BankDebt, 'kind' | 'description'>): string {
  return debt.description?.trim() || DEBT_KIND_LABELS[debt.kind];
}

// Renda

export const INCOME_KIND_LABELS: Record<IncomeItemKind, { title: string; singular: string }> = {
  salary: { title: 'Salário bruto', singular: 'salário' },
  benefit: { title: 'Benefícios', singular: 'benefício' },
  deduction: { title: 'Descontos fixos', singular: 'desconto' },
};


export interface IncomeSummary {
  grossCents: number;
  benefitsCents: number;
  /** Benefícios que não caem na conta (VR/VA...). */
  nonCashBenefitsCents: number;
  deductionsCents: number;
  /** Tudo o que você recebe por mês: bruto + benefícios − descontos. */
  netCents: number;
  /** O que de fato chega na conta e pode pagar contas e dívidas. */
  netCashCents: number;
}

export function summarizeIncome(items: Pick<IncomeItem, 'kind' | 'amountCents' | 'inCash'>[]): IncomeSummary {
  let grossCents = 0;
  let benefitsCents = 0;
  let nonCashBenefitsCents = 0;
  let deductionsCents = 0;
  for (const item of items) {
    if (item.kind === 'salary') grossCents += item.amountCents;
    else if (item.kind === 'deduction') deductionsCents += item.amountCents;
    else {
      benefitsCents += item.amountCents;
      if (item.inCash === false) nonCashBenefitsCents += item.amountCents;
    }
  }
  const netCents = grossCents + benefitsCents - deductionsCents;
  return {
    grossCents,
    benefitsCents,
    nonCashBenefitsCents,
    deductionsCents,
    netCents,
    netCashCents: netCents - nonCashBenefitsCents,
  };
}

// Patrimônio

export interface DebtWithBank extends BankDebt {
  bankId: string;
  bankName: string;
}

export function flattenDebts(banks: Bank[]): DebtWithBank[] {
  return banks.flatMap((bank) =>
    (bank.debts ?? []).map((debt) => ({ ...debt, bankId: bank.id, bankName: bank.name })),
  );
}

export interface NetWorth {
  savedCents: number;
  debtCents: number;
  netWorthCents: number;
}

export function summarizeNetWorth(banks: Bank[]): NetWorth {
  const savedCents = banks.reduce((sum, b) => sum + (b.balanceCents ?? 0), 0);
  const debtCents = flattenDebts(banks).reduce((sum, d) => sum + d.balanceCents, 0);
  return { savedCents, debtCents, netWorthCents: savedCents - debtCents };
}

/** Parcelas que não estão em Contas a pagar nem em desconto de salário — entram à parte na previsão do mês. */
export function untrackedPaymentsCents(debts: BankDebt[]): number {
  return debts
    .filter((d) => d.paymentTracked === false && d.monthlyPaymentCents)
    .reduce((sum, d) => sum + (d.monthlyPaymentCents as number), 0);
}

export function minimumPaymentsCents(debts: BankDebt[]): number {
  return debts.reduce((sum, d) => sum + Math.min(d.monthlyPaymentCents ?? 0, d.balanceCents), 0);
}

// Simulação de quitação

export interface PayoffMonth {
  /** Mês da simulação (1 = próximo mês). */
  month: number;
  debtCents: number;
  /** Parte do orçamento que sobrou depois de quitar as dívidas. */
  leftoverCents: number;
}

export interface PayoffResult {
  /** Meses até zerar tudo; `null` se não quita no horizonte simulado. */
  months: number | null;
  totalInterestCents: number;
  /** Mês em que cada dívida termina (por id). */
  payoffMonthById: Record<string, number | null>;
  timeline: PayoffMonth[];
}

interface SimDebt {
  id: string;
  balance: number;
  rate: number;
  minPayment: number;
  /** Parcelado com valor fixo: os juros já estão embutidos nas parcelas. */
  fixed: boolean;
}

function toSimDebt(debt: BankDebt): SimDebt {
  const fixed = Boolean(debt.installmentsLeft && debt.monthlyPaymentCents);
  return {
    id: debt.id,
    balance: debt.balanceCents,
    rate: fixed ? 0 : (debt.interestRateMonthly ?? 0) / 100,
    minPayment: debt.monthlyPaymentCents ?? 0,
    fixed,
  };
}

/**
 * Simula mês a mês: juros sobre o saldo, parcelas mínimas e o que sobrar do
 * orçamento indo para a dívida de maior juros (método avalanche — o que
 * mais economiza juros). Valores em centavos.
 */
export function simulatePayoff(debts: BankDebt[], monthlyBudgetCents: number, maxMonths = 600): PayoffResult {
  const sims = debts.filter((d) => d.balanceCents > 0).map(toSimDebt);
  const payoffMonthById: Record<string, number | null> = Object.fromEntries(debts.map((d) => [d.id, d.balanceCents > 0 ? null : 0]));
  const timeline: PayoffMonth[] = [];
  let totalInterest = 0;

  // Ordem da avalanche: maior juros primeiro; empate → menor saldo (quita mais rápido).
  const priority = [...sims].sort((a, b) => b.rate - a.rate || a.balance - b.balance);

  for (let month = 1; month <= maxMonths; month++) {
    let budget = monthlyBudgetCents;
    for (const d of sims) {
      if (d.balance <= 0) continue;
      const interest = Math.round(d.balance * d.rate);
      d.balance += interest;
      totalInterest += interest;
    }
    for (const d of sims) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
      budget -= pay;
    }
    for (const d of priority) {
      if (budget <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(budget, d.balance);
      d.balance -= pay;
      budget -= pay;
    }
    for (const d of sims) {
      if (d.balance <= 0 && payoffMonthById[d.id] === null) payoffMonthById[d.id] = month;
    }
    const debtCents = sims.reduce((sum, d) => sum + Math.max(0, d.balance), 0);
    timeline.push({ month, debtCents, leftoverCents: Math.max(0, budget) });
    if (debtCents === 0) {
      return { months: month, totalInterestCents: totalInterest, payoffMonthById, timeline };
    }
  }
  return { months: sims.length === 0 ? 0 : null, totalInterestCents: totalInterest, payoffMonthById, timeline };
}

/** Orçamento mensal total (parcelas + extra) necessário para zerar as dívidas em `months` meses. */
export function requiredMonthlyBudget(debts: BankDebt[], months: number): number {
  const total = debts.reduce((sum, d) => sum + d.balanceCents, 0);
  if (total === 0) return 0;
  const finishes = (budget: number) => {
    const result = simulatePayoff(debts, budget, months);
    return result.months !== null && result.months <= months;
  };
  let hi = Math.max(total, 100);
  for (let i = 0; i < 40 && !finishes(hi); i++) hi *= 2;
  let lo = 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (finishes(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 100) * 100;
}

// Projeção do patrimônio

export interface ProjectionPoint {
  month: number;
  savedCents: number;
  debtCents: number;
}

/**
 * Projeção para os próximos meses seguindo o plano sugerido: a sobra mensal
 * vai para as dívidas (avalanche) e, depois de quitadas, para o guardado.
 * Se a sobra for negativa, o déficit sai do guardado.
 */
export function projectNetWorth(
  savedCents: number,
  debts: BankDebt[],
  monthlySurplusCents: number,
  months = 12,
): ProjectionPoint[] {
  const budget = minimumPaymentsCents(debts) + Math.max(0, monthlySurplusCents);
  const { timeline } = simulatePayoff(debts, budget, months);
  const deficit = Math.min(0, monthlySurplusCents);
  const debtAtStart = debts.reduce((sum, d) => sum + d.balanceCents, 0);
  const points: ProjectionPoint[] = [{ month: 0, savedCents, debtCents: debtAtStart }];
  let saved = savedCents;
  for (let month = 1; month <= months; month++) {
    const step = timeline[month - 1];
    saved += (step ? step.leftoverCents : budget) + deficit;
    points.push({ month, savedCents: Math.max(0, saved), debtCents: step ? step.debtCents : 0 });
  }
  return points;
}

// Dicas

export type InsightTone = 'alert' | 'warn' | 'good' | 'info';

export interface Insight {
  icon: string;
  tone: InsightTone;
  text: string;
}

export interface InsightContext {
  incomeNetCashCents: number;
  surplusCents: number;
  billsTotalCents: number;
  overdueBills: number;
  savedCents: number;
  debts: DebtWithBank[];
  monthlyCostCents: number;
  categoryAlerts: { name: string; icon: string; currentCents: number; averageCents: number }[];
}

const HIGH_RATE = 4;

export function buildInsights(ctx: InsightContext): Insight[] {
  const insights: Insight[] = [];
  const hasIncome = ctx.incomeNetCashCents > 0;

  if (!hasIncome) {
    insights.push({ icon: '💼', tone: 'info', text: 'Cadastre seu salário, benefícios e descontos em Renda para ver previsões do mês.' });
  } else if (ctx.surplusCents < 0) {
    insights.push({
      icon: '🚨',
      tone: 'alert',
      text: `Os compromissos do mês passam a renda em ${formatCurrency(-ctx.surplusCents)}. Reveja contas que dá para cortar ou adiar.`,
    });
  }

  if (ctx.overdueBills > 0) {
    insights.push({
      icon: '⏰',
      tone: 'alert',
      text: `${ctx.overdueBills} ${ctx.overdueBills === 1 ? 'conta vencida' : 'contas vencidas'} este mês — atraso gera multa e juros.`,
    });
  }

  const expensive = [...ctx.debts]
    .filter((d) => (d.interestRateMonthly ?? 0) >= HIGH_RATE && d.balanceCents > 0 && !(d.installmentsLeft && d.monthlyPaymentCents))
    .sort((a, b) => (b.interestRateMonthly ?? 0) - (a.interestRateMonthly ?? 0));
  for (const debt of expensive.slice(0, 2)) {
    const monthlyInterest = Math.round(debt.balanceCents * ((debt.interestRateMonthly ?? 0) / 100));
    insights.push({
      icon: '🔥',
      tone: 'alert',
      text: `${debtLabel(debt)} (${debt.bankName}) cobra ${formatRate(debt.interestRateMonthly ?? 0)} ao mês: cerca de ${formatCurrency(monthlyInterest)} só de juros por mês. Priorize quitá-la.`,
    });
  }

  const emergencyTarget = ctx.monthlyCostCents * 3;
  if (expensive.length > 0 && ctx.savedCents > emergencyTarget && emergencyTarget > 0) {
    const usable = ctx.savedCents - emergencyTarget;
    insights.push({
      icon: '💡',
      tone: 'warn',
      text: `Você tem ${formatCurrency(ctx.savedCents)} guardado. Mantendo 3 meses de reserva, sobram ${formatCurrency(usable)} que, usados na dívida mais cara, rendem mais do que qualquer investimento.`,
    });
  }

  if (ctx.monthlyCostCents > 0) {
    const covered = ctx.savedCents / ctx.monthlyCostCents;
    if (covered < 3) {
      insights.push({
        icon: '🛟',
        tone: 'warn',
        text: `Sua reserva cobre ${formatMonths(covered)} do custo de vida. O ideal é ter de 3 a 6 meses (${formatCurrency(ctx.monthlyCostCents * 6)}).`,
      });
    } else {
      insights.push({ icon: '🛟', tone: 'good', text: `Sua reserva cobre ${formatMonths(covered)} do custo de vida. Muito bom!` });
    }
  }

  if (hasIncome && ctx.billsTotalCents > 0) {
    const share = ctx.billsTotalCents / ctx.incomeNetCashCents;
    if (share > 0.5) {
      insights.push({
        icon: '📊',
        tone: 'warn',
        text: `As contas do mês consomem ${Math.round(share * 100)}% da sua renda em conta. Uma referência saudável é até 50%.`,
      });
    }
  }

  const debtPayments = ctx.debts.reduce((sum, d) => sum + (d.monthlyPaymentCents ?? 0), 0);
  if (hasIncome && debtPayments / ctx.incomeNetCashCents > 0.3) {
    insights.push({
      icon: '⚖️',
      tone: 'warn',
      text: `Parcelas de dívidas somam ${Math.round((debtPayments / ctx.incomeNetCashCents) * 100)}% da renda. Acima de 30% vale evitar novos parcelamentos.`,
    });
  }

  for (const alert of ctx.categoryAlerts.slice(0, 2)) {
    const pct = Math.round((alert.currentCents / alert.averageCents - 1) * 100);
    insights.push({
      icon: alert.icon,
      tone: 'warn',
      text: `${alert.name}: ${formatCurrency(alert.currentCents)} este mês, ${pct}% acima da sua média dos últimos meses.`,
    });
  }

  if (ctx.debts.length === 0 && hasIncome && ctx.surplusCents > 0) {
    insights.push({ icon: '✅', tone: 'good', text: 'Nenhuma dívida cadastrada — direcione a sobra para a reserva e seus objetivos.' });
  }

  return insights;
}

/**
 * Sugestão de destino para a sobra: com dívidas, a maior parte acelera a
 * quitação; sem reserva mínima, parte vai para ela primeiro.
 */
export function suggestSurplusSplit(
  surplusCents: number,
  hasDebts: boolean,
  reserveMonths: number,
): { debtsCents: number; reserveCents: number; freeCents: number } {
  if (surplusCents <= 0) return { debtsCents: 0, reserveCents: 0, freeCents: 0 };
  const shares = hasDebts
    ? reserveMonths < 1
      ? [0.5, 0.3, 0.2]
      : [0.7, 0.1, 0.2]
    : reserveMonths < 6
      ? [0, 0.6, 0.4]
      : [0, 0.3, 0.7];
  const debtsCents = Math.round(surplusCents * shares[0]);
  const reserveCents = Math.round(surplusCents * shares[1]);
  return { debtsCents, reserveCents, freeCents: surplusCents - debtsCents - reserveCents };
}

export function formatRate(rate: number): string {
  return `${rate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

export function formatMonths(value: number): string {
  if (value < 1) return 'menos de 1 mês';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('pt-BR')} ${rounded === 1 ? 'mês' : 'meses'}`;
}
