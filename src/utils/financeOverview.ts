import type { Bank, Bill, ExtraIncome, IncomeItem, RecurringBill, Transaction } from '../types';
import { addMonths, buildMonthBills, summarizeBills } from './finance';
import {
  buildInsights,
  flattenDebts,
  minimumPaymentsCents,
  projectNetWorth,
  simulatePayoff,
  suggestSurplusSplit,
  summarizeIncome,
  summarizeNetWorth,
  untrackedPaymentsCents,
} from './financePlanning';
import { summarizeTransactions } from './transactions';

export interface FinanceData {
  banks: Bank[];
  incomeItems: IncomeItem[];
  extraIncomes: ExtraIncome[];
  bills: Bill[];
  recurringBills: RecurringBill[];
  transactions: Transaction[];
}

export interface CategoryAlert {
  name: string;
  icon: string;
  currentCents: number;
  averageCents: number;
}

/**
 * Visão geral do mês usada pelo Painel e pelo relatório completo. Aceita
 * coleções inteiras: extras, contas e extratos são filtrados pelo mês aqui.
 */
export function buildFinanceOverview(data: FinanceData, month: string) {
  const { banks } = data;
  const debts = flattenDebts(banks);
  const worth = summarizeNetWorth(banks);
  const income = summarizeIncome(data.incomeItems);
  const extrasCents = data.extraIncomes.filter((e) => e.month === month).reduce((sum, e) => sum + e.amountCents, 0);
  const monthBills = buildMonthBills(month, data.bills, data.recurringBills);
  const bills = summarizeBills(monthBills);
  const untracked = untrackedPaymentsCents(debts);
  const surplusCents = income.netCashCents + extrasCents - bills.totalCents - untracked;

  // Gastos dos extratos: mês atual x média dos três meses anteriores (só meses com dados).
  const byMonth = new Map<string, Transaction[]>();
  for (const tx of data.transactions) byMonth.set(tx.month, [...(byMonth.get(tx.month) ?? []), tx]);
  const current = summarizeTransactions(byMonth.get(month) ?? []);
  const previous = [1, 2, 3].map((n) => byMonth.get(addMonths(month, -n))).filter((m): m is Transaction[] => !!m?.length).map(summarizeTransactions);
  const avgSpendingCents = previous.length ? Math.round(previous.reduce((s, p) => s + p.expenseCents, 0) / previous.length) : 0;
  const categoryAlerts: CategoryAlert[] = current.byCategory
    .map((c) => {
      const avg = previous.length
        ? previous.reduce((s, p) => s + (p.byCategory.find((x) => x.category.id === c.category.id)?.spentCents ?? 0), 0) / previous.length
        : 0;
      return { name: c.category.name, icon: c.category.icon, currentCents: c.spentCents, averageCents: Math.round(avg) };
    })
    .filter((c) => c.averageCents > 0 && c.currentCents > c.averageCents * 1.2 && c.currentCents - c.averageCents > 5000)
    .sort((a, b) => b.currentCents - b.averageCents - (a.currentCents - a.averageCents));

  // Custo de vida: o maior entre compromissos do mês e o gasto médio real dos extratos.
  const monthlyCostCents = Math.max(bills.totalCents + untracked, avgSpendingCents);
  const reserveMonths = monthlyCostCents > 0 ? worth.savedCents / monthlyCostCents : 0;

  const mins = minimumPaymentsCents(debts);
  const basePlan = simulatePayoff(debts, mins);
  const surplusPlan = simulatePayoff(debts, mins + Math.max(0, surplusCents));
  const projection = projectNetWorth(worth.savedCents, debts, surplusCents, 12);

  return {
    debts,
    worth,
    income,
    extrasCents,
    monthBills,
    bills,
    untracked,
    surplusCents,
    current,
    avgSpendingCents,
    categoryAlerts,
    monthlyCostCents,
    reserveMonths,
    mins,
    basePlan,
    surplusPlan,
    projection,
    split: suggestSurplusSplit(surplusCents, debts.length > 0, reserveMonths),
    insights: buildInsights({
      incomeNetCashCents: income.netCashCents,
      surplusCents,
      billsTotalCents: bills.totalCents,
      overdueBills: bills.overdueCount,
      savedCents: worth.savedCents,
      debts,
      monthlyCostCents,
      categoryAlerts,
    }),
  };
}

export type FinanceOverview = ReturnType<typeof buildFinanceOverview>;
