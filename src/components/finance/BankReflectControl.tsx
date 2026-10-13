import { applyNetToBank, debtLabel, type BankReflection, type BankTarget } from '../../utils/financePlanning';
import { formatCurrency } from '../../utils/finance';
import type { Bank } from '../../types';
import '../registration/QuickRegister.css';
import './finance.css';

function targetValue(target: BankTarget): string {
  return target.kind === 'balance' ? 'balance' : `debt:${target.debtId}`;
}

function parseTarget(value: string): BankTarget {
  return value.startsWith('debt:') ? { kind: 'debt', debtId: value.slice(5) } : { kind: 'balance' };
}

interface BankReflectControlProps {
  id: string;
  banks: Bank[];
  /** Entradas − saídas das transações novas do extrato. */
  netCents: number;
  value: BankReflection | null;
  onToggle: (enabled: boolean) => void;
  onChange: (value: BankReflection) => void;
}

/** Opção (desmarcada por padrão) de levar o resultado do extrato para a página Bancos. */
export function BankReflectControl({ id, banks, netCents, value, onToggle, onChange }: BankReflectControlProps) {
  if (banks.length === 0) {
    return <span>Para refletir em Bancos, cadastre o banco na página Bancos.</span>;
  }

  const bank = value ? banks.find((b) => b.id === value.bankId) : undefined;
  const result = bank && value ? applyNetToBank(bank, value.target, netCents, 'preview') : null;
  const target = value?.target;
  const targetDebt = target?.kind === 'debt' ? (bank?.debts ?? []).find((d) => d.id === target.debtId) : undefined;

  return (
    <div className="rumo-import-reflect">
      <label className="rumo-checkbox">
        <input type="checkbox" checked={value !== null} onChange={(e) => onToggle(e.target.checked)} />
        <span>Refletir em Bancos</span>
      </label>

      {value && bank && result && (
        <>
          <div className="rumo-form-row-2">
            <div>
              <label className="rumo-form-label" htmlFor={`${id}-bank`}>
                Banco
              </label>
              <select
                id={`${id}-bank`}
                className="rumo-form-select"
                value={value.bankId}
                onChange={(e) => onChange({ bankId: e.target.value, target: { kind: 'balance' } })}
              >
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="rumo-form-label" htmlFor={`${id}-target`}>
                Aplicar em
              </label>
              <select
                id={`${id}-target`}
                className="rumo-form-select"
                value={targetValue(value.target)}
                onChange={(e) => onChange({ bankId: value.bankId, target: parseTarget(e.target.value) })}
              >
                <option value="balance">Guardado</option>
                {(bank.debts ?? []).map((d) => (
                  <option key={d.id} value={`debt:${d.id}`}>
                    Dívida: {debtLabel(d)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span>
            {netCents === 0
              ? 'Entradas e saídas se anulam — nada muda no banco.'
              : targetDebt
                ? `${debtLabel(targetDebt)}: ${formatCurrency(targetDebt.balanceCents)} → ${formatCurrency(
                    result.debts.find((d) => d.id === targetDebt.id)?.balanceCents ?? 0,
                  )}`
                : `Guardado: ${formatCurrency(bank.balanceCents ?? 0)} → ${formatCurrency(result.balanceCents)}`}
          </span>
          {result.overdraftCents > 0 && (
            <span className="rumo-import-reflect-warning">
              O guardado não cobre as saídas: {formatCurrency(result.overdraftCents)} entram como cheque especial.
            </span>
          )}
        </>
      )}
    </div>
  );
}
