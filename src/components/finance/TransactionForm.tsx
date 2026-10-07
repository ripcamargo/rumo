import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { deleteTransaction, setTransactionCategory } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { SPENDING_CATEGORIES, getSpendingCategory } from '../../utils/transactions';
import { formatCurrency } from '../../utils/finance';
import { formatShortDate } from '../../utils/dates';
import type { Transaction } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

export function TransactionForm({ transaction, onDone }: { transaction: Transaction; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await setTransactionCategory(user.uid, transaction.id, transaction.descriptionKey, categoryId, applyToSimilar);
      showToast(`Categoria: ${getSpendingCategory(categoryId).name}`);
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteTransaction(user.uid, transaction.id);
      showToast('Transação removida');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="rumo-form">
      <div className="rumo-import-statement">
        <strong>{transaction.description}</strong>
        <span>
          {formatShortDate(transaction.date.toDate())} · {transaction.accountLabel}
        </span>
        <span className={transaction.amountCents > 0 ? 'rumo-tx-amount--in' : ''}>
          {formatCurrency(transaction.amountCents)}
        </span>
      </div>

      <div>
        <span className="rumo-form-label">Categoria</span>
        <div className="rumo-segmented">
          {SPENDING_CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`rumo-segmented-item ${categoryId === category.id ? 'rumo-segmented-item--active' : ''}`}
              onClick={() => setCategoryId(category.id)}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
        {getSpendingCategory(categoryId).ignored && (
          <p className="rumo-form-hint" style={{ marginTop: 'var(--rumo-space-2)' }}>
            Transferências entre suas contas e pagamento de fatura ficam fora dos totais.
          </p>
        )}
      </div>

      <label className="rumo-checkbox">
        <input type="checkbox" checked={applyToSimilar} onChange={(e) => setApplyToSimilar(e.target.checked)} />
        <span>Aplicar a todas as transações com esta descrição, inclusive nas próximas importações</span>
      </label>

      {error && <p className="rumo-form-error">{error}</p>}

      <Button variant="success" size="lg" fullWidth disabled={saving} onClick={() => void handleSave()}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
      <Button variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
        {confirmingDelete ? 'Toque de novo para confirmar' : 'Remover transação'}
      </Button>
    </div>
  );
}
