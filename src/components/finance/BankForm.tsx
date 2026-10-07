import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addBank, deleteBank, updateBank } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { centsToInput, parseOptionalCurrencyInput } from '../../utils/finance';
import type { Bank } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

const BANK_SUGGESTIONS = ['Itaú', 'Nubank', 'Bradesco', 'Banco do Brasil', 'Caixa', 'Santander', 'Inter', 'C6 Bank', 'Mercado Pago', 'PicPay'];

/** Cadastro do banco e do valor guardado nele. Saldo zerado é válido (conta só com dívida). */
export function BankForm({ bank, onDone }: { bank?: Bank; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(bank?.name ?? '');
  const [balance, setBalance] = useState(bank ? centsToInput(bank.balanceCents) : '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const balanceCents = parseOptionalCurrencyInput(balance);
    if (!name.trim()) return setError('Informe o nome do banco.');
    if (balanceCents === null) return setError('Informe um valor válido para o saldo guardado.');

    setSaving(true);
    setError(null);
    try {
      if (bank) await updateBank(user.uid, bank.id, { name: name.trim(), balanceCents });
      else await addBank(user.uid, { name: name.trim(), balanceCents });
      showToast(bank ? 'Banco atualizado' : 'Banco adicionado');
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!user || !bank) return;
    if (!confirmingDelete) return setConfirmingDelete(true);
    setSaving(true);
    try {
      await deleteBank(user.uid, bank.id);
      showToast('Banco removido');
      onDone();
    } catch {
      setError('Não foi possível remover agora. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="bank-name-input">
          Banco
        </label>
        <input
          id="bank-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Itaú"
          autoFocus={!bank}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {!bank && (
          <div className="rumo-segmented" style={{ marginTop: 'var(--rumo-space-2)' }}>
            {BANK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={`rumo-segmented-item ${name === suggestion ? 'rumo-segmented-item--active' : ''}`}
                onClick={() => setName(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="rumo-form-label" htmlFor="bank-balance-input">
          Valor guardado (R$)
        </label>
        <input
          id="bank-balance-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <p className="rumo-form-hint" style={{ marginTop: 'var(--rumo-space-1)' }}>
          Saldo em conta + investimentos e poupança. As dívidas você cadastra depois, dentro do banco.
        </p>
      </div>

      {error && <p className="rumo-form-error">{error}</p>}

      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
      {bank && (
        <Button type="button" variant="outline" fullWidth disabled={saving} onClick={() => void handleDelete()}>
          {confirmingDelete ? 'Toque de novo para confirmar (remove as dívidas também)' : 'Remover banco'}
        </Button>
      )}
    </form>
  );
}
