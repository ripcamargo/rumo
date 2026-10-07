import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  addExtraIncome,
  addIncomeItem,
  deleteExtraIncome,
  deleteIncomeItem,
  updateExtraIncome,
  updateIncomeItem,
} from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import {
  centsToInput,
  dueDateFor,
  fromDateInputValue,
  parseCurrencyInput,
  toDateInputValue,
  toMonthKey,
} from '../../utils/finance';
import type { ExtraIncome, IncomeItem, IncomeItemKind } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

const SUGGESTIONS: Record<IncomeItemKind, string[]> = {
  salary: ['Salário', 'Adiantamento', 'Pró-labore', 'Aposentadoria'],
  benefit: ['Vale-refeição', 'Vale-alimentação', 'Auxílio home office', 'Vale-transporte', 'Bônus/PLR mensal'],
  deduction: ['INSS', 'IRRF', 'Plano de saúde', 'Plano odontológico', 'Consignado', 'Vale-transporte', 'Previdência privada', 'Pensão'],
};

/** Benefícios que normalmente são pagos em cartão próprio, não em conta. */
const NON_CASH_BENEFITS = ['Vale-refeição', 'Vale-alimentação', 'Vale-transporte'];

interface IncomeItemFormProps {
  kind: IncomeItemKind;
  item?: IncomeItem;
  onDone: () => void;
}

export function IncomeItemForm({ kind, item, onDone }: IncomeItemFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? centsToInput(item.amountCents) : '');
  const [inCash, setInCash] = useState(item?.inCash ?? true);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickSuggestion(suggestion: string) {
    setName(suggestion);
    if (kind === 'benefit') setInCash(!NON_CASH_BENEFITS.includes(suggestion));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amountCents = parseCurrencyInput(amount);
    if (!name.trim()) return setError('Informe um nome.');
    if (!amountCents) return setError('Informe um valor válido.');
    setSaving(true);
    setError(null);
    try {
      const data = { name: name.trim(), amountCents, inCash: kind === 'benefit' ? inCash : undefined };
      if (item) await updateIncomeItem(user.uid, item.id, data);
      else await addIncomeItem(user.uid, { kind, ...data });
      showToast(item ? 'Atualizado' : 'Adicionado');
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !item) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    setSaving(true);
    try {
      await deleteIncomeItem(user.uid, item.id);
      showToast('Removido');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="income-name-input">
          Nome
        </label>
        <input
          id="income-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder={SUGGESTIONS[kind][0]}
          autoFocus={!item}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {!item && (
          <div className="rumo-segmented" style={{ marginTop: 'var(--rumo-space-2)' }}>
            {SUGGESTIONS[kind].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`rumo-segmented-item ${name === suggestion ? 'rumo-segmented-item--active' : ''}`}
                onClick={() => pickSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="rumo-form-label" htmlFor="income-amount-input">
          Valor mensal (R$)
        </label>
        <input
          id="income-amount-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {kind === 'salary' && (
          <p className="rumo-form-hint" style={{ marginTop: 'var(--rumo-space-1)' }}>
            Use o valor bruto do holerite. INSS, IR e outros descontos entram em Descontos fixos.
          </p>
        )}
      </div>

      {kind === 'benefit' && (
        <label className="rumo-checkbox">
          <input type="checkbox" checked={inCash} onChange={(e) => setInCash(e.target.checked)} />
          <span>Cai na conta em dinheiro (desmarque para cartões como VR/VA, que não pagam contas nem dívidas)</span>
        </label>
      )}

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
      {item && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete ? 'Toque de novo para confirmar' : 'Remover'}
        </Button>
      )}
    </form>
  );
}

const EXTRA_SUGGESTIONS = ['Venda', 'Freela', 'Reembolso', '13º salário', 'Férias', 'Restituição IR', 'Presente'];

export function ExtraIncomeForm({ month, income, onDone }: { month: string; income?: ExtraIncome; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [description, setDescription] = useState(income?.description ?? '');
  const [amount, setAmount] = useState(income ? centsToInput(income.amountCents) : '');
  const [date, setDate] = useState(() =>
    toDateInputValue(income?.date.toDate() ?? (toMonthKey(new Date()) === month ? new Date() : dueDateFor(month, 1))),
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const amountCents = parseCurrencyInput(amount);
    const parsedDate = fromDateInputValue(date);
    if (!description.trim()) return setError('Descreva a entrada.');
    if (!amountCents) return setError('Informe um valor válido.');
    if (!parsedDate) return setError('Informe a data.');
    setSaving(true);
    setError(null);
    try {
      const data = { description: description.trim(), amountCents, date: parsedDate };
      if (income) await updateExtraIncome(user.uid, income.id, data);
      else await addExtraIncome(user.uid, data);
      showToast(income ? 'Entrada atualizada' : 'Entrada adicionada');
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !income) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    setSaving(true);
    try {
      await deleteExtraIncome(user.uid, income.id);
      showToast('Entrada removida');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="extra-description-input">
          Descrição
        </label>
        <input
          id="extra-description-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Venda da bicicleta"
          autoFocus={!income}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {!income && (
          <div className="rumo-segmented" style={{ marginTop: 'var(--rumo-space-2)' }}>
            {EXTRA_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`rumo-segmented-item ${description === suggestion ? 'rumo-segmented-item--active' : ''}`}
                onClick={() => setDescription(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="extra-amount-input">
            Valor (R$)
          </label>
          <input
            id="extra-amount-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="extra-date-input">
            Data
          </label>
          <input
            id="extra-date-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
      {income && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete ? 'Toque de novo para confirmar' : 'Remover entrada'}
        </Button>
      )}
    </form>
  );
}
