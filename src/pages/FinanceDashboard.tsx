import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Timestamp, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Card } from '../components/common/Card';
import { Loading } from '../components/common/Loading';
import { ProjectionChart } from '../components/finance/ProjectionChart';
import {
  addMonths,
  buildMonthBills,
  dueDateFor,
  formatCurrency,
  formatMonthLabel,
  formatShortMonthLabel,
  getDueStatus,
  summarizeBills,
  toMonthKey,
} from '../utils/finance';
import { formatShortDate } from '../utils/dates';
import {
  buildInsights,
  debtLabel,
  flattenDebts,
  formatMonths,
  formatRate,
  minimumPaymentsCents,
  projectNetWorth,
  requiredMonthlyBudget,
  simulatePayoff,
  suggestSurplusSplit,
  summarizeIncome,
  summarizeNetWorth,
  untrackedPaymentsCents,
} from '../utils/financePlanning';
import { summarizeTransactions } from '../utils/transactions';
import type { Bank, Bill, ExtraIncome, IncomeItem, RecurringBill, Transaction } from '../types';
import '../components/finance/finance.css';

const PAYOFF_TARGETS = [6, 12, 24] as const;

function monthFromNow(months: number): string {
  return formatShortMonthLabel(addMonths(toMonthKey(new Date()), months));
}

export default function FinanceDashboard() {
  const { user } = useAuth();
  const month = toMonthKey(new Date());
  const historyStart = useMemo(() => {
    const start = dueDateFor(addMonths(month, -3), 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }, [month]);
  const [target, setTarget] = useState<(typeof PAYOFF_TARGETS)[number]>(12);

  const banksQ = useFirestoreCollection<Bank>(user?.uid, 'banks', [], 0, null);
  const incomeQ = useFirestoreCollection<IncomeItem>(user?.uid, 'incomeItems', [], 0, null);
  const extrasQ = useFirestoreCollection<ExtraIncome>(user?.uid, 'extraIncomes', [where('month', '==', month)], month, null);
  const billsQ = useFirestoreCollection<Bill>(user?.uid, 'bills', [where('month', '==', month)], month, null);
  const recurringQ = useFirestoreCollection<RecurringBill>(user?.uid, 'recurringBills', [], 0, null);
  const txQ = useFirestoreCollection<Transaction>(
    user?.uid,
    'transactions',
    [where('date', '>=', Timestamp.fromDate(historyStart))],
    historyStart.getTime(),
    null,
  );

  const loading = [banksQ, incomeQ, extrasQ, billsQ, recurringQ, txQ].some((q) => q.loading);

  const view = useMemo(() => {
    const banks = banksQ.data;
    const debts = flattenDebts(banks);
    const worth = summarizeNetWorth(banks);
    const income = summarizeIncome(incomeQ.data);
    const extrasCents = extrasQ.data.reduce((sum, e) => sum + e.amountCents, 0);
    const monthBills = buildMonthBills(month, billsQ.data, recurringQ.data);
    const bills = summarizeBills(monthBills);
    const untracked = untrackedPaymentsCents(debts);
    const surplusCents = income.netCashCents + extrasCents - bills.totalCents - untracked;

    // Gastos dos extratos: mês atual x média dos três meses anteriores (só meses com dados).
    const byMonth = new Map<string, Transaction[]>();
    for (const tx of txQ.data) byMonth.set(tx.month, [...(byMonth.get(tx.month) ?? []), tx]);
    const current = summarizeTransactions(byMonth.get(month) ?? []);
    const previous = [1, 2, 3].map((n) => byMonth.get(addMonths(month, -n))).filter((m): m is Transaction[] => !!m?.length).map(summarizeTransactions);
    const avgSpendingCents = previous.length ? Math.round(previous.reduce((s, p) => s + p.expenseCents, 0) / previous.length) : 0;
    const categoryAlerts = current.byCategory
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
    const upcoming = monthBills.filter((b) => !b.paid).slice(0, 4);

    return {
      debts,
      worth,
      income,
      extrasCents,
      bills,
      untracked,
      surplusCents,
      current,
      avgSpendingCents,
      monthlyCostCents,
      reserveMonths,
      mins,
      basePlan,
      surplusPlan,
      projection,
      upcoming,
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
      setup: [
        { done: incomeQ.data.length > 0, label: 'Cadastre seu salário, benefícios e descontos', to: '/financas/renda' },
        { done: banks.length > 0, label: 'Cadastre seus bancos, saldos e dívidas', to: '/financas/bancos' },
        { done: monthBills.length > 0, label: 'Lance as contas do mês', to: '/financas/contas' },
        { done: txQ.data.length > 0, label: 'Importe um extrato para analisar seus gastos', to: '/financas/gastos' },
      ],
    };
  }, [banksQ.data, incomeQ.data, extrasQ.data, billsQ.data, recurringQ.data, txQ.data, month]);

  const required = useMemo(() => requiredMonthlyBudget(view.debts, target), [view.debts, target]);

  if (loading) return <Loading />;

  const {
    debts,
    worth,
    income,
    bills,
    surplusCents,
    current,
    avgSpendingCents,
    monthlyCostCents,
    reserveMonths,
    mins,
    basePlan,
    surplusPlan,
    projection,
    upcoming,
    split,
    insights,
    setup,
  } = view;
  const pendingSetup = setup.filter((s) => !s.done);
  const extraNeeded = Math.max(0, required - mins);
  const reserveTarget = monthlyCostCents * 6;
  const reservePercent = reserveTarget > 0 ? Math.min(100, Math.round((worth.savedCents / reserveTarget) * 100)) : 0;
  const lastPoint = projection[projection.length - 1];
  const interestSaved = basePlan.months !== null ? basePlan.totalInterestCents - surplusPlan.totalInterestCents : null;
  const priority = [...debts]
    .filter((d) => d.balanceCents > 0)
    .sort((a, b) => (b.interestRateMonthly ?? 0) - (a.interestRateMonthly ?? 0) || a.balanceCents - b.balanceCents);

  return (
    <div className="rumo-dashboard">
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Painel</h1>
        <span className="rumo-finance-subtitle" style={{ margin: 0 }}>
          {formatMonthLabel(month)}
        </span>
      </header>

      {pendingSetup.length > 0 && (
        <Card className="rumo-setup-card">
          <h2 className="rumo-spending-title">Comece por aqui ({setup.length - pendingSetup.length}/{setup.length})</h2>
          <ul className="rumo-setup-list">
            {setup.map((step) => (
              <li key={step.to} className={step.done ? 'rumo-setup-step--done' : ''}>
                <span aria-hidden="true">{step.done ? '✅' : '⬜'}</span>
                {step.done ? <span>{step.label}</span> : <Link to={step.to}>{step.label} →</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="rumo-finance-summary">
        <div className="rumo-finance-summary-main">
          <span className="rumo-finance-summary-label">Sobra prevista no mês</span>
          <span className={`rumo-finance-summary-value ${surplusCents < 0 ? 'rumo-finance-summary-value--negative' : ''}`}>
            {formatCurrency(surplusCents)}
          </span>
        </div>
        <div className="rumo-flow">
          <span>Renda em conta</span>
          <strong>+ {formatCurrency(income.netCashCents)}</strong>
          {view.extrasCents > 0 && (
            <>
              <span>Entradas avulsas</span>
              <strong>+ {formatCurrency(view.extrasCents)}</strong>
            </>
          )}
          <span>Contas do mês</span>
          <strong>− {formatCurrency(bills.totalCents)}</strong>
          {view.untracked > 0 && (
            <>
              <span>Parcelas fora das contas</span>
              <strong>− {formatCurrency(view.untracked)}</strong>
            </>
          )}
        </div>
        {bills.remainingCents > 0 && (
          <span className="rumo-finance-summary-count">
            Ainda falta pagar {formatCurrency(bills.remainingCents)} em contas este mês
          </span>
        )}
      </Card>

      <div className="rumo-stat-grid">
        <Link to="/financas/bancos" className="rumo-stat">
          <span className="rumo-stat-label">Patrimônio líquido</span>
          <span className={`rumo-stat-value ${worth.netWorthCents < 0 ? 'rumo-stat-value--negative' : ''}`}>
            {formatCurrency(worth.netWorthCents)}
          </span>
          <span className="rumo-stat-hint">guardado − dívidas</span>
        </Link>
        <Link to="/financas/bancos" className="rumo-stat">
          <span className="rumo-stat-label">Guardado</span>
          <span className="rumo-stat-value">{formatCurrency(worth.savedCents)}</span>
          <span className="rumo-stat-hint">
            {monthlyCostCents > 0 ? `${formatMonths(reserveMonths)} de reserva` : 'em todos os bancos'}
          </span>
        </Link>
        <Link to="/financas/bancos" className="rumo-stat">
          <span className="rumo-stat-label">Dívidas</span>
          <span className="rumo-stat-value">{formatCurrency(worth.debtCents)}</span>
          <span className="rumo-stat-hint">
            {debts.length === 0 ? 'nenhuma cadastrada' : `${debts.length} ${debts.length === 1 ? 'dívida' : 'dívidas'}`}
          </span>
        </Link>
      </div>

      {insights.length > 0 && (
        <Card className="rumo-dashboard-card">
          <h2 className="rumo-spending-title">Dicas para você</h2>
          <ul className="rumo-insights">
            {insights.map((insight) => (
              <li key={insight.text} className={`rumo-insight rumo-insight--${insight.tone}`}>
                <span aria-hidden="true">{insight.icon}</span>
                <span>{insight.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {debts.length > 0 && (
        <Card className="rumo-dashboard-card">
          <h2 className="rumo-spending-title">Plano para sair das dívidas</h2>
          <div className="rumo-plan-rows">
            <div>
              <span className="rumo-plan-label">Só pagando as parcelas</span>
              <strong>
                {basePlan.months === null
                  ? 'sem previsão de quitação'
                  : `${formatMonths(basePlan.months)} · ${monthFromNow(basePlan.months)}`}
              </strong>
              {basePlan.months === null && (
                <span className="rumo-plan-hint">Há dívidas sem parcela definida ou com parcela menor que os juros.</span>
              )}
            </div>
            {surplusCents > 0 && (
              <div>
                <span className="rumo-plan-label">Usando toda a sobra ({formatCurrency(surplusCents)}/mês)</span>
                <strong>
                  {surplusPlan.months === null
                    ? 'ainda sem quitação'
                    : `${formatMonths(surplusPlan.months)} · ${monthFromNow(surplusPlan.months)}`}
                </strong>
                {interestSaved !== null && interestSaved > 0 && (
                  <span className="rumo-plan-hint">Economia de {formatCurrency(interestSaved)} em juros.</span>
                )}
              </div>
            )}
          </div>

          <div className="rumo-plan-target">
            <span className="rumo-form-label">Quero zerar as dívidas em</span>
            <div className="rumo-segmented">
              {PAYOFF_TARGETS.map((months) => (
                <button
                  key={months}
                  type="button"
                  className={`rumo-segmented-item ${target === months ? 'rumo-segmented-item--active' : ''}`}
                  onClick={() => setTarget(months)}
                >
                  {months} meses
                </button>
              ))}
            </div>
            <p className="rumo-plan-answer">
              Separe <strong>{formatCurrency(required)}/mês</strong> para as dívidas
              {mins > 0 && extraNeeded > 0 && <> ({formatCurrency(mins)} de parcelas + {formatCurrency(extraNeeded)} extra)</>}.
            </p>
            {extraNeeded > 0 && (
              <p className={`rumo-plan-verdict ${surplusCents >= extraNeeded ? 'rumo-plan-verdict--ok' : 'rumo-plan-verdict--short'}`}>
                {surplusCents >= extraNeeded
                  ? `✅ Cabe na sua sobra prevista — ainda restam ${formatCurrency(surplusCents - extraNeeded)}.`
                  : `⚠️ Faltam ${formatCurrency(extraNeeded - Math.max(0, surplusCents))}/mês na sua sobra. Tente um prazo maior ou corte gastos.`}
              </p>
            )}
          </div>

          <h3 className="rumo-plan-subtitle">Ordem sugerida (maiores juros primeiro)</h3>
          <ol className="rumo-plan-order">
            {priority.map((debt) => {
              const payoff = surplusPlan.payoffMonthById[debt.id];
              return (
                <li key={debt.id}>
                  <span className="rumo-bill-main">
                    <span className="rumo-bill-name">
                      {debtLabel(debt)} <small>· {debt.bankName}</small>
                    </span>
                    <span className="rumo-bill-amount">{formatCurrency(debt.balanceCents)}</span>
                  </span>
                  <span className="rumo-bill-meta">
                    {debt.interestRateMonthly ? `${formatRate(debt.interestRateMonthly)} a.m.` : 'juros não informados'}
                    {payoff ? ` · quitada em ${monthFromNow(payoff)}` : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {(worth.savedCents > 0 || debts.length > 0) && (
        <Card className="rumo-dashboard-card">
          <h2 className="rumo-spending-title">Próximos 12 meses</h2>
          <p className="rumo-finance-subtitle">
            Seguindo o plano: a sobra vai para as dívidas e, quitadas, para o guardado.
          </p>
          <ProjectionChart points={projection} />
          <p className="rumo-plan-hint">
            Em {monthFromNow(12)}: guardado {formatCurrency(lastPoint.savedCents)} · dívidas{' '}
            {formatCurrency(lastPoint.debtCents)} · patrimônio {formatCurrency(lastPoint.savedCents - lastPoint.debtCents)}
          </p>
        </Card>
      )}

      {surplusCents > 0 && (
        <Card className="rumo-dashboard-card">
          <h2 className="rumo-spending-title">Sugestão para a sobra de {formatCurrency(surplusCents)}</h2>
          <ul className="rumo-split">
            {split.debtsCents > 0 && (
              <li>
                <span>🎯 Antecipar dívidas</span>
                <strong>{formatCurrency(split.debtsCents)}</strong>
              </li>
            )}
            {split.reserveCents > 0 && (
              <li>
                <span>🛟 Reserva de emergência</span>
                <strong>{formatCurrency(split.reserveCents)}</strong>
              </li>
            )}
            <li>
              <span>🎉 Livre para gastar</span>
              <strong>{formatCurrency(split.freeCents)}</strong>
            </li>
          </ul>
        </Card>
      )}

      {monthlyCostCents > 0 && (
        <Card className="rumo-dashboard-card">
          <h2 className="rumo-spending-title">Reserva de emergência</h2>
          <div className="rumo-finance-progress rumo-finance-progress--light" aria-hidden="true">
            <div className="rumo-finance-progress-bar" style={{ width: `${reservePercent}%` }} />
          </div>
          <p className="rumo-plan-hint">
            {formatCurrency(worth.savedCents)} de {formatCurrency(reserveTarget)} (6 meses de custo de vida de{' '}
            {formatCurrency(monthlyCostCents)}) · {reservePercent}%
          </p>
        </Card>
      )}

      <div className="rumo-dashboard-columns">
        <Card className="rumo-dashboard-card">
          <div className="rumo-spending-list-header">
            <h2 className="rumo-spending-title">Próximas contas</h2>
            <Link to="/financas/contas" className="rumo-form-link">
              Ver todas
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rumo-finance-subtitle">
              {bills.totalCents > 0 ? 'Todas as contas do mês estão pagas. 🎉' : 'Nenhuma conta lançada este mês.'}
            </p>
          ) : (
            <ul className="rumo-mini-list">
              {upcoming.map((bill) => {
                const status = getDueStatus(bill);
                return (
                  <li key={bill.id}>
                    <span>
                      {bill.name}
                      <small>
                        {' '}
                        · {formatShortDate(bill.dueDate)}
                        {status.label && <span className={`rumo-bill-status rumo-bill-status--${status.kind}`}>{status.label}</span>}
                      </small>
                    </span>
                    <strong>{formatCurrency(bill.amountCents)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="rumo-dashboard-card">
          <div className="rumo-spending-list-header">
            <h2 className="rumo-spending-title">Gastos do mês (extratos)</h2>
            <Link to="/financas/gastos" className="rumo-form-link">
              Detalhes
            </Link>
          </div>
          {current.expenseCents === 0 ? (
            <p className="rumo-finance-subtitle">Importe o extrato do mês para acompanhar seus gastos reais.</p>
          ) : (
            <>
              <p className="rumo-plan-answer">
                <strong>{formatCurrency(current.expenseCents)}</strong>
                {avgSpendingCents > 0 && <> · média recente {formatCurrency(avgSpendingCents)}</>}
              </p>
              <ul className="rumo-mini-list">
                {current.byCategory.slice(0, 4).map((c) => (
                  <li key={c.category.id}>
                    <span>
                      {c.category.icon} {c.category.name}
                    </span>
                    <strong>{formatCurrency(c.spentCents)}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
