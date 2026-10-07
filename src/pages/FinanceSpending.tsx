import { useMemo, useState } from 'react';
import { where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Card } from '../components/common/Card';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { MonthNav } from '../components/finance/MonthNav';
import { OfxImport } from '../components/finance/OfxImport';
import { TransactionForm } from '../components/finance/TransactionForm';
import { formatCurrency, toMonthKey } from '../utils/finance';
import { formatShortDate } from '../utils/dates';
import { getSpendingCategory, summarizeTransactions } from '../utils/transactions';
import type { CategoryRule, Transaction } from '../types';
import '../components/finance/finance.css';

export default function FinanceSpending() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const { data: transactions, loading } = useFirestoreCollection<Transaction>(
    user?.uid,
    'transactions',
    [where('month', '==', month)],
    month,
    null,
  );
  const { data: ruleDocs } = useFirestoreCollection<CategoryRule>(user?.uid, 'categoryRules', [], 0, null);
  const rules = useMemo(() => new Map(ruleDocs.map((r) => [r.key, r.categoryId])), [ruleDocs]);

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.toMillis() - a.date.toMillis() || a.description.localeCompare(b.description)),
    [transactions],
  );
  const summary = useMemo(() => summarizeTransactions(transactions), [transactions]);
  const visible = categoryFilter ? sorted.filter((t) => getSpendingCategory(t.categoryId).id === categoryFilter) : sorted;
  const largestCategory = summary.byCategory[0]?.spentCents ?? 0;

  function changeMonth(next: string) {
    setMonth(next);
    setCategoryFilter(null);
  }

  return (
    <div>
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Gastos</h1>
        <OfxImport rules={rules} onImported={changeMonth} />
      </header>

      <MonthNav month={month} onChange={changeMonth} />

      {loading ? (
        <Loading />
      ) : transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon="📥"
            title="Nenhuma transação neste mês."
            description="No app ou internet banking do seu banco, exporte o extrato (ou a fatura do cartão) em OFX ou TXT e importe aqui. Dá para importar vários arquivos de uma vez — o que já foi importado é ignorado."
          />
        </Card>
      ) : (
        <>
          <Card className="rumo-finance-summary">
            <div className="rumo-finance-summary-main">
              <span className="rumo-finance-summary-label">Gasto no mês</span>
              <span className="rumo-finance-summary-value">{formatCurrency(summary.expenseCents)}</span>
            </div>
            <div className="rumo-finance-summary-row">
              <span>
                Entradas <strong>{formatCurrency(summary.incomeCents)}</strong>
              </span>
              <span>
                Saldo <strong>{formatCurrency(summary.balanceCents)}</strong>
              </span>
            </div>
            {summary.ignoredCount > 0 && (
              <span className="rumo-finance-summary-count">
                {summary.ignoredCount} {summary.ignoredCount === 1 ? 'transferência' : 'transferências'} fora dos totais
              </span>
            )}
          </Card>

          {summary.byCategory.length > 0 && (
            <Card className="rumo-spending-card">
              <h2 className="rumo-spending-title">Por categoria</h2>
              <ul className="rumo-category-bars">
                {summary.byCategory.map(({ category, spentCents, count }) => {
                  const percent = summary.expenseCents > 0 ? Math.round((spentCents / summary.expenseCents) * 100) : 0;
                  const active = categoryFilter === category.id;
                  return (
                    <li key={category.id}>
                      <button
                        type="button"
                        className={`rumo-category-bar ${active ? 'rumo-category-bar--active' : ''}`}
                        aria-pressed={active}
                        title={`${count} ${count === 1 ? 'transação' : 'transações'}`}
                        onClick={() => setCategoryFilter(active ? null : category.id)}
                      >
                        <span className="rumo-category-bar-label">
                          <span>
                            {category.icon} {category.name}
                          </span>
                          <span className="rumo-category-bar-value">
                            {formatCurrency(spentCents)} <small>{percent}%</small>
                          </span>
                        </span>
                        <span className="rumo-category-bar-track" aria-hidden="true">
                          <span
                            className="rumo-category-bar-fill"
                            style={{ width: `${Math.max(2, (spentCents / largestCategory) * 100)}%` }}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <div className="rumo-spending-list-header">
            <h2 className="rumo-spending-title">
              {categoryFilter
                ? `${getSpendingCategory(categoryFilter).icon} ${getSpendingCategory(categoryFilter).name}`
                : 'Transações'}{' '}
              <small>({visible.length})</small>
            </h2>
            {categoryFilter && (
              <button type="button" className="rumo-form-link" onClick={() => setCategoryFilter(null)}>
                Ver todas
              </button>
            )}
          </div>

          <Card padded={false}>
            <ul className="rumo-bill-list">
              {visible.map((tx) => {
                const category = getSpendingCategory(tx.categoryId);
                return (
                  <li key={tx.id} className={`rumo-bill ${category.ignored ? 'rumo-tx--ignored' : ''}`}>
                    <button type="button" className="rumo-bill-body" onClick={() => setEditing(tx)}>
                      <span className="rumo-bill-main">
                        <span className="rumo-bill-name rumo-tx-description">{tx.description}</span>
                        <span className={`rumo-bill-amount ${tx.amountCents > 0 ? 'rumo-tx-amount--in' : ''}`}>
                          {formatCurrency(tx.amountCents)}
                        </span>
                      </span>
                      <span className="rumo-bill-meta">
                        {formatShortDate(tx.date.toDate())} · {tx.accountLabel}
                        <span className="rumo-bill-tag">
                          {category.icon} {category.name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Transação">
        {editing && <TransactionForm key={editing.id} transaction={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
