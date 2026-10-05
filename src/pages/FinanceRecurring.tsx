import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { RecurringBillForm } from '../components/finance/RecurringBillForm';
import {
  formatCurrency,
  formatShortMonthLabel,
  isRecurringActiveIn,
  monthDiff,
  recurringEndMonth,
  toMonthKey,
} from '../utils/finance';
import type { RecurringBill } from '../types';
import '../components/finance/finance.css';

function describe(recurring: RecurringBill, currentMonth: string): string {
  const parts = [`Todo dia ${recurring.dueDay}`];
  const end = recurringEndMonth(recurring);
  if (end) {
    parts.push(`${recurring.installments}x`);
    if (monthDiff(currentMonth, end) < 0) parts.push(`terminou em ${formatShortMonthLabel(end)}`);
    else parts.push(`até ${formatShortMonthLabel(end)}`);
  }
  if (monthDiff(currentMonth, recurring.startMonth) > 0) {
    parts.push(`começa em ${formatShortMonthLabel(recurring.startMonth)}`);
  }
  return parts.join(' · ');
}

export default function FinanceRecurring() {
  const { user } = useAuth();
  const { data: recurringBills, loading } = useFirestoreCollection<RecurringBill>(
    user?.uid,
    'recurringBills',
    [],
    0,
    'name',
  );
  const [editing, setEditing] = useState<RecurringBill | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const currentMonth = toMonthKey(new Date());
  const sorted = [...recurringBills].sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name, 'pt-BR'));
  const monthlyTotal = sorted
    .filter((r) => isRecurringActiveIn(r, currentMonth))
    .reduce((sum, r) => sum + r.amountCents, 0);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(recurring: RecurringBill) {
    setEditing(recurring);
    setFormOpen(true);
  }

  return (
    <div>
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Contas fixas</h1>
        <Button variant="success" className="rumo-finance-desktop-only" onClick={openNew}>
          + Nova conta fixa
        </Button>
      </header>

      {loading ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon="🔁"
            title="Nenhuma conta fixa."
            description="Contas fixas e parceladas aparecem automaticamente em cada mês, prontas para marcar como pagas."
            action={
              <Button variant="success" onClick={openNew}>
                + Nova conta fixa
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <p className="rumo-finance-subtitle">
            Compromisso fixo deste mês: <strong>{formatCurrency(monthlyTotal)}</strong>
          </p>
          <Card padded={false}>
            <ul className="rumo-bill-list">
              {sorted.map((recurring) => {
                const active = isRecurringActiveIn(recurring, currentMonth);
                return (
                  <li key={recurring.id} className={`rumo-bill ${active ? '' : 'rumo-bill--paid'}`}>
                    <button type="button" className="rumo-bill-body" onClick={() => openEdit(recurring)}>
                      <span className="rumo-bill-main">
                        <span className="rumo-bill-name">{recurring.name}</span>
                        <span className="rumo-bill-amount">{formatCurrency(recurring.amountCents)}</span>
                      </span>
                      <span className="rumo-bill-meta">{describe(recurring, currentMonth)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      <button type="button" className="rumo-fab" aria-label="Nova conta fixa" onClick={openNew}>
        +
      </button>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar conta fixa' : 'Nova conta fixa'}
      >
        <RecurringBillForm key={editing?.id ?? 'new'} recurring={editing} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
