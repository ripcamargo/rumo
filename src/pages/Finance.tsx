import { useMemo, useState } from 'react';
import { where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { saveMonthBill } from '../services/firebase/firestore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { BillForm } from '../components/finance/BillForm';
import {
  addMonths,
  buildMonthBills,
  formatCurrency,
  formatMonthLabel,
  getDueStatus,
  summarizeBills,
  toMonthKey,
  type MonthBill,
} from '../utils/finance';
import { formatShortDate } from '../utils/dates';
import type { Bill, RecurringBill } from '../types';
import '../components/finance/finance.css';

export default function Finance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const currentMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(currentMonth);

  const { data: bills, loading: loadingBills } = useFirestoreCollection<Bill>(
    user?.uid,
    'bills',
    [where('month', '==', month)],
    month,
    null,
  );
  const { data: templates, loading: loadingTemplates } = useFirestoreCollection<RecurringBill>(
    user?.uid,
    'recurringBills',
    [],
    0,
    'name',
  );

  const monthBills = useMemo(() => buildMonthBills(month, bills, templates), [month, bills, templates]);
  const summary = useMemo(() => summarizeBills(monthBills), [monthBills]);
  const paidPercent = summary.totalCents > 0 ? Math.round((summary.paidCents / summary.totalCents) * 100) : 0;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MonthBill | undefined>(undefined);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(bill: MonthBill) {
    setEditing(bill);
    setFormOpen(true);
  }

  async function togglePaid(bill: MonthBill) {
    if (!user || togglingId) return;
    setTogglingId(bill.id);
    try {
      await saveMonthBill(user.uid, bill, { paid: !bill.paid });
      showToast(bill.paid ? `${bill.name} marcada como pendente` : `${bill.name} paga ✓`);
    } catch {
      showToast('Não foi possível atualizar agora. Tente novamente.', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  const loading = loadingBills || loadingTemplates;

  return (
    <div>
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Contas</h1>
        <Button variant="success" className="rumo-finance-desktop-only" onClick={openNew}>
          + Nova conta
        </Button>
      </header>

      <div className="rumo-month-nav">
        <button
          type="button"
          className="rumo-month-nav-btn"
          aria-label="Mês anterior"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          ‹
        </button>
        <div className="rumo-month-nav-label">
          <span>{formatMonthLabel(month)}</span>
          {month !== currentMonth && (
            <button type="button" className="rumo-form-link" onClick={() => setMonth(currentMonth)}>
              Voltar para o mês atual
            </button>
          )}
        </div>
        <button
          type="button"
          className="rumo-month-nav-btn"
          aria-label="Próximo mês"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          ›
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <Card className="rumo-finance-summary">
            <div className="rumo-finance-summary-main">
              <span className="rumo-finance-summary-label">Restante a pagar</span>
              <span className="rumo-finance-summary-value">{formatCurrency(summary.remainingCents)}</span>
              {summary.overdueCount > 0 && (
                <span className="rumo-finance-summary-alert">
                  ⚠️ {summary.overdueCount} {summary.overdueCount === 1 ? 'conta vencida' : 'contas vencidas'}
                </span>
              )}
            </div>
            <div className="rumo-finance-progress" aria-hidden="true">
              <div className="rumo-finance-progress-bar" style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="rumo-finance-summary-row">
              <span>
                Pago <strong>{formatCurrency(summary.paidCents)}</strong>
              </span>
              <span>
                Total do mês <strong>{formatCurrency(summary.totalCents)}</strong>
              </span>
            </div>
            {monthBills.length > 0 && (
              <span className="rumo-finance-summary-count">
                {summary.paidCount} de {monthBills.length} {monthBills.length === 1 ? 'conta paga' : 'contas pagas'}
              </span>
            )}
          </Card>

          {monthBills.length === 0 ? (
            <Card>
              <EmptyState
                icon="💸"
                title="Nenhuma conta neste mês."
                description="Adicione suas contas — as fixas e parceladas aparecem sozinhas nos próximos meses."
                action={
                  <Button variant="success" onClick={openNew}>
                    + Nova conta
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card padded={false}>
              <ul className="rumo-bill-list">
                {monthBills.map((bill) => {
                  const status = getDueStatus(bill);
                  return (
                    <li key={bill.id} className={`rumo-bill ${bill.paid ? 'rumo-bill--paid' : ''}`}>
                      <button
                        type="button"
                        className={`rumo-bill-check ${bill.paid ? 'rumo-bill-check--on' : ''}`}
                        aria-label={bill.paid ? `Desmarcar ${bill.name} como paga` : `Marcar ${bill.name} como paga`}
                        aria-pressed={bill.paid}
                        disabled={togglingId === bill.id}
                        onClick={() => void togglePaid(bill)}
                      >
                        {bill.paid ? '✓' : ''}
                      </button>
                      <button type="button" className="rumo-bill-body" onClick={() => openEdit(bill)}>
                        <span className="rumo-bill-main">
                          <span className="rumo-bill-name">
                            {bill.name}
                            {bill.installmentLabel && <span className="rumo-bill-tag">{bill.installmentLabel}</span>}
                            {bill.recurringId && !bill.installmentLabel && (
                              <span className="rumo-bill-tag" title="Conta fixa">
                                🔁
                              </span>
                            )}
                          </span>
                          <span className="rumo-bill-amount">{formatCurrency(bill.amountCents)}</span>
                        </span>
                        <span className="rumo-bill-meta">
                          Vence {formatShortDate(bill.dueDate)}
                          {status.label && status.kind !== 'paid' && (
                            <span className={`rumo-bill-status rumo-bill-status--${status.kind}`}>
                              {status.label}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </>
      )}

      <button type="button" className="rumo-fab" aria-label="Nova conta" onClick={openNew}>
        +
      </button>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar conta' : 'Nova conta'}>
        <BillForm key={editing?.id ?? 'new'} month={month} bill={editing} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
