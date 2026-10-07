import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addRecurringBill, saveBankDebts } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { centsToInput, formatCurrency, parseCurrencyInput, toMonthKey } from '../../utils/finance';
import { DEBT_KIND_LABELS } from '../../utils/financePlanning';
import { DEBT_KINDS, type Bank, type BankDebt, type DebtKind } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

/** Juros de referência para orientar quem não sabe a taxa. */
const RATE_HINTS: Partial<Record<DebtKind, string>> = {
  cartao: 'Rotativo do cartão costuma passar de 12% ao mês.',
  cheque_especial: 'Cheque especial é limitado a 8% ao mês.',
  emprestimo: 'Consignado fica perto de 1,8% ao mês; pessoal, de 4% a 8%.',
  financiamento: 'Veículos e imóveis costumam ficar entre 1% e 2,5% ao mês.',
};

type PaymentMode = 'create_bill' | 'tracked' | 'untracked';

const PAYMENT_MODES: { value: PaymentMode; label: string; createOnly?: boolean }[] = [
  { value: 'create_bill', label: 'Criar em Contas a pagar', createOnly: true },
  { value: 'tracked', label: 'Já está em Contas ou no desconto do salário' },
  { value: 'untracked', label: 'Não lançar' },
];

function parseOptionalNumber(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function DebtForm({ bank, debt, onDone }: { bank: Bank; debt?: BankDebt; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? 'cartao');
  const [description, setDescription] = useState(debt?.description ?? '');
  const [balance, setBalance] = useState(debt ? centsToInput(debt.balanceCents) : '');
  const [payment, setPayment] = useState(debt?.monthlyPaymentCents ? centsToInput(debt.monthlyPaymentCents) : '');
  const [installments, setInstallments] = useState(debt?.installmentsLeft ? String(debt.installmentsLeft) : '');
  const [rate, setRate] = useState(debt?.interestRateMonthly ? String(debt.interestRateMonthly).replace('.', ',') : '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    debt ? (debt.paymentTracked === false ? 'untracked' : 'tracked') : 'create_bill',
  );
  const [dueDay, setDueDay] = useState('10');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentCents = payment.trim() ? parseCurrencyInput(payment) : undefined;
  const installmentsCount = parseOptionalNumber(installments);
  const remainingTotal =
    paymentCents && installmentsCount && Number.isInteger(installmentsCount) ? paymentCents * installmentsCount : null;

  async function persist(debts: BankDebt[], message: string) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveBankDebts(user.uid, bank.id, debts);
      showToast(message);
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    // Sem saldo informado, mas com parcelas: o saldo é o total das parcelas restantes.
    const balanceCents = balance.trim() ? parseCurrencyInput(balance) : remainingTotal;
    const rateValue = parseOptionalNumber(rate);
    if (!balanceCents) return setError('Informe quanto falta pagar (ou a parcela e quantas faltam).');
    if (paymentCents === null) return setError('Informe um valor de parcela válido.');
    if (installmentsCount === null || (installmentsCount !== undefined && !Number.isInteger(installmentsCount))) {
      return setError('Parcelas restantes deve ser um número inteiro.');
    }
    if (rateValue === null || (rateValue ?? 0) > 100) return setError('Informe os juros ao mês em %, ex.: 2,5.');
    const day = Number(dueDay);
    if (paymentMode === 'create_bill' && paymentCents && (!Number.isInteger(day) || day < 1 || day > 31)) {
      return setError('Informe o dia de vencimento da parcela (1 a 31).');
    }

    const next: BankDebt = {
      id: debt?.id ?? crypto.randomUUID(),
      kind,
      description: description.trim() || undefined,
      balanceCents,
      monthlyPaymentCents: paymentCents,
      installmentsLeft: installmentsCount,
      interestRateMonthly: rateValue,
      paymentTracked: paymentCents ? paymentMode !== 'untracked' : undefined,
    };

    if (!debt && paymentCents && paymentMode === 'create_bill') {
      try {
        await addRecurringBill(user.uid, {
          name: `${description.trim() || DEBT_KIND_LABELS[kind]} (${bank.name})`,
          amountCents: paymentCents,
          dueDay: day,
          startMonth: toMonthKey(new Date()),
          installments: installmentsCount,
        });
      } catch {
        return setError('Não foi possível criar a conta a pagar. Tente novamente.');
      }
    }

    const debts = debt ? bank.debts.map((d) => (d.id === debt.id ? next : d)) : [...(bank.debts ?? []), next];
    await persist(debts, debt ? 'Dívida atualizada' : 'Dívida adicionada');
  }

  async function handleDelete() {
    if (!debt) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    await persist(
      bank.debts.filter((d) => d.id !== debt.id),
      'Dívida removida',
    );
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <span className="rumo-form-label">Tipo</span>
        <div className="rumo-segmented">
          {DEBT_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              className={`rumo-segmented-item ${kind === value ? 'rumo-segmented-item--active' : ''}`}
              onClick={() => setKind(value)}
            >
              {DEBT_KIND_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="rumo-form-label" htmlFor="debt-description-input">
          Descrição (opcional)
        </label>
        <input
          id="debt-description-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder={kind === 'emprestimo' ? 'Consignado' : 'Fatura do cartão'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="debt-payment-input">
            Parcela mensal (R$)
          </label>
          <input
            id="debt-payment-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="debt-installments-input">
            Parcelas restantes
          </label>
          <input
            id="debt-installments-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="Opcional"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          />
        </div>
      </div>

      <div className="rumo-form-row-2">
        <div>
          <label className="rumo-form-label" htmlFor="debt-balance-input">
            Quanto falta pagar (R$)
          </label>
          <input
            id="debt-balance-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder={remainingTotal ? centsToInput(remainingTotal) : '0,00'}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="debt-rate-input">
            Juros ao mês (%)
          </label>
          <input
            id="debt-rate-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            inputMode="decimal"
            placeholder="Opcional"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>
      <p className="rumo-form-hint">
        {remainingTotal && !balance.trim()
          ? `Sem valor informado, consideramos o total das parcelas: ${formatCurrency(remainingTotal)}. `
          : 'Use o saldo devedor ou o valor para quitação que aparece no app do banco. '}
        {RATE_HINTS[kind]}
      </p>

      {paymentCents ? (
        <div>
          <span className="rumo-form-label">A parcela mensal…</span>
          <div className="rumo-segmented">
            {PAYMENT_MODES.filter((m) => !m.createOnly || !debt).map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={`rumo-segmented-item ${paymentMode === mode.value ? 'rumo-segmented-item--active' : ''}`}
                onClick={() => setPaymentMode(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {paymentMode === 'create_bill' && (
            <div style={{ marginTop: 'var(--rumo-space-3)' }}>
              <label className="rumo-form-label" htmlFor="debt-due-day-input">
                Dia de vencimento da parcela
              </label>
              <input
                id="debt-due-day-input"
                className="rumo-form-input rumo-form-input-secondary"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          )}
          {paymentMode === 'untracked' && (
            <p className="rumo-form-hint" style={{ marginTop: 'var(--rumo-space-2)' }}>
              A parcela será descontada à parte na previsão do mês.
            </p>
          )}
        </div>
      ) : null}

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
      {debt && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete ? 'Toque de novo para confirmar' : 'Remover dívida (quitada)'}
        </Button>
      )}
    </form>
  );
}
