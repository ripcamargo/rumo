import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  addRecurringBill,
  deleteRecurringBill,
  updateRecurringBill,
} from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { centsToInput, parseCurrencyInput, toMonthKey } from '../../utils/finance';
import type { RecurringBill } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

interface RecurringBillFormProps {
  recurring?: RecurringBill;
  onDone: () => void;
}

export function RecurringBillForm({ recurring, onDone }: RecurringBillFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(recurring?.name ?? '');
  const [amount, setAmount] = useState(recurring ? centsToInput(recurring.amountCents) : '');
  const [dueDay, setDueDay] = useState(String(recurring?.dueDay ?? new Date().getDate()));
  const [startMonth, setStartMonth] = useState(recurring?.startMonth ?? toMonthKey(new Date()));
  const [installments, setInstallments] = useState(recurring?.installments ? String(recurring.installments) : '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amountCents = parseCurrencyInput(amount);
    const day = Number(dueDay);
    const count = installments.trim() ? Number(installments) : null;
    if (!name.trim()) return setError('Informe o nome da conta.');
    if (!amountCents) return setError('Informe um valor válido.');
    if (!Number.isInteger(day) || day < 1 || day > 31) return setError('O dia de vencimento deve estar entre 1 e 31.');
    if (!/^\d{4}-\d{2}$/.test(startMonth)) return setError('Informe o mês de início.');
    if (count !== null && (!Number.isInteger(count) || count < 1)) {
      return setError('O número de parcelas deve ser 1 ou mais (deixe vazio para conta sem fim).');
    }

    setSaving(true);
    setError(null);
    try {
      const data = { name: name.trim(), amountCents, dueDay: day, startMonth };
      if (recurring) {
        await updateRecurringBill(user.uid, recurring.id, { ...data, installments: count });
        showToast('Conta fixa atualizada');
      } else {
        await addRecurringBill(user.uid, { ...data, installments: count ?? undefined });
        showToast('Conta fixa adicionada');
      }
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !recurring) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteRecurringBill(user.uid, recurring.id);
      showToast('Conta fixa removida');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="recurring-name-input">
          Conta
        </label>
        <input
          id="recurring-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Internet"
          autoFocus={!recurring}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="recurring-amount-input">
            Valor (R$)
          </label>
          <input
            id="recurring-amount-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="recurring-day-input">
            Dia do vencimento
          </label>
          <input
            id="recurring-day-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </div>
      </div>

      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="recurring-start-input">
            Começa em
          </label>
          <input
            id="recurring-start-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="recurring-installments-input">
            Parcelas (opcional)
          </label>
          <input
            id="recurring-installments-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Sem fim"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          />
        </div>
      </div>

      <p className="rumo-form-hint">
        Alterações valem para os meses em que a conta ainda não foi paga nem editada individualmente.
      </p>

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>

      {recurring && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete ? 'Toque de novo para confirmar' : 'Remover conta fixa'}
        </Button>
      )}
      {recurring && confirmingDelete && (
        <p className="rumo-form-hint">
          Contas já pagas ou editadas continuam no histórico; as demais deixam de aparecer.
        </p>
      )}
    </form>
  );
}
