import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  addBill,
  addRecurringBill,
  removeMonthBill,
  saveMonthBill,
} from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import {
  addMonths,
  centsToInput,
  dueDateFor,
  firstDayOfMonthInput,
  fromDateInputValue,
  lastDayOfMonthInput,
  parseCurrencyInput,
  toDateInputValue,
  toMonthKey,
  type MonthBill,
} from '../../utils/finance';
import '../registration/QuickRegister.css';
import './finance.css';

type Repeat = 'once' | 'monthly' | 'installments';

const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'once', label: 'Só este mês' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'installments', label: 'Parcelada' },
];

interface BillFormProps {
  /** Mês exibido na tela — usado como padrão do vencimento de uma conta nova. */
  month: string;
  /** Conta existente para edição; ausente ao criar. */
  bill?: MonthBill;
  onDone: () => void;
}

function defaultDueDate(month: string): Date {
  const today = new Date();
  return toMonthKey(today) === month ? today : dueDateFor(month, 10);
}

export function BillForm({ month, bill, onDone }: BillFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(bill?.name ?? '');
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amountCents) : '');
  const [dueDate, setDueDate] = useState(toDateInputValue(bill?.dueDate ?? defaultDueDate(month)));
  const [repeat, setRepeat] = useState<Repeat>('once');
  const [installments, setInstallments] = useState('');
  const [currentInstallment, setCurrentInstallment] = useState('1');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecurringInstance = Boolean(bill?.recurringId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amountCents = parseCurrencyInput(amount);
    const due = fromDateInputValue(dueDate);
    if (!name.trim()) return setError('Informe o nome da conta.');
    if (!amountCents) return setError('Informe um valor válido.');
    if (!due) return setError('Informe a data de vencimento.');

    let installmentsCount: number | undefined;
    let current = 1;
    if (!bill && repeat === 'installments') {
      installmentsCount = Number(installments);
      current = Number(currentInstallment);
      if (!Number.isInteger(installmentsCount) || installmentsCount < 2) {
        return setError('Informe o número de parcelas (2 ou mais).');
      }
      if (!Number.isInteger(current) || current < 1 || current > installmentsCount) {
        return setError('A parcela atual deve estar entre 1 e o total de parcelas.');
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (bill) {
        await saveMonthBill(user.uid, bill, { name: name.trim(), amountCents, dueDate: due });
        showToast('Conta atualizada');
      } else if (repeat === 'once') {
        await addBill(user.uid, { name: name.trim(), amountCents, dueDate: due });
        showToast('Conta adicionada');
      } else {
        await addRecurringBill(user.uid, {
          name: name.trim(),
          amountCents,
          dueDay: due.getDate(),
          // Parcela atual 3 em outubro ⇒ a conta começou em agosto.
          startMonth: addMonths(toMonthKey(due), -(current - 1)),
          installments: installmentsCount,
        });
        showToast(repeat === 'monthly' ? 'Conta fixa adicionada' : 'Conta parcelada adicionada');
      }
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !bill) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    try {
      await removeMonthBill(user.uid, bill);
      showToast('Conta removida');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="bill-name-input">
          Conta
        </label>
        <input
          id="bill-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Luz + Água"
          autoFocus={!bill}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="bill-amount-input">
            Valor (R$)
          </label>
          <input
            id="bill-amount-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="bill-due-input">
            Vencimento
          </label>
          <input
            id="bill-due-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="date"
            value={dueDate}
            min={isRecurringInstance && bill ? firstDayOfMonthInput(bill.month) : undefined}
            max={isRecurringInstance && bill ? lastDayOfMonthInput(bill.month) : undefined}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      {!bill && (
        <div>
          <span className="rumo-form-label">Repetição</span>
          <div className="rumo-segmented">
            {REPEAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rumo-segmented-item ${repeat === option.value ? 'rumo-segmented-item--active' : ''}`}
                onClick={() => setRepeat(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!bill && repeat === 'installments' && (
        <div className="rumo-form-row-2">
          <div>
            <label className="rumo-form-label" htmlFor="bill-installments-input">
              Nº de parcelas
            </label>
            <input
              id="bill-installments-input"
              className="rumo-form-input rumo-form-input-secondary"
              type="number"
              inputMode="numeric"
              min={2}
              placeholder="12"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </div>
          <div>
            <label className="rumo-form-label" htmlFor="bill-current-installment-input">
              Parcela deste mês
            </label>
            <input
              id="bill-current-installment-input"
              className="rumo-form-input rumo-form-input-secondary"
              type="number"
              inputMode="numeric"
              min={1}
              value={currentInstallment}
              onChange={(e) => setCurrentInstallment(e.target.value)}
            />
          </div>
        </div>
      )}

      {!bill && repeat !== 'once' && (
        <p className="rumo-form-hint">
          A conta aparece automaticamente {repeat === 'monthly' ? 'em todos os meses' : 'até a última parcela'},
          sempre no mesmo dia de vencimento. O valor pode ser ajustado mês a mês.
        </p>
      )}

      {isRecurringInstance && (
        <p className="rumo-form-hint">
          🔁 Conta fixa — as alterações valem só para este mês. Para mudar todos os meses, use a aba Fixas.
        </p>
      )}

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>

      {bill && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete
            ? 'Toque de novo para confirmar'
            : isRecurringInstance
              ? 'Remover só deste mês'
              : 'Remover conta'}
        </Button>
      )}
    </form>
  );
}
