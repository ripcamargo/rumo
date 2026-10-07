import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { BankForm } from '../components/finance/BankForm';
import { DebtForm } from '../components/finance/DebtForm';
import { addMonths, formatCurrency, formatShortMonthLabel, toMonthKey } from '../utils/finance';
import { DEBT_KIND_LABELS, debtLabel, formatRate, simulatePayoff, summarizeNetWorth } from '../utils/financePlanning';
import type { Bank, BankDebt } from '../types';
import '../components/finance/finance.css';

type ModalState =
  | { type: 'bank'; bank?: Bank }
  | { type: 'debt'; bank: Bank; debt?: BankDebt }
  | null;

/** Previsão de quitação de uma dívida pagando só a parcela informada. */
function payoffLabel(debt: BankDebt): string | null {
  if (!debt.monthlyPaymentCents) return null;
  const { months } = simulatePayoff([debt], debt.monthlyPaymentCents, 360);
  if (months === null) return 'a parcela não cobre os juros';
  return `quita em ${formatShortMonthLabel(addMonths(toMonthKey(new Date()), months))}`;
}

export default function FinanceBanks() {
  const { user } = useAuth();
  const { data: banks, loading } = useFirestoreCollection<Bank>(user?.uid, 'banks', [], 0, 'name');
  const [modal, setModal] = useState<ModalState>(null);

  const sorted = [...banks].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const summary = summarizeNetWorth(banks);
  const close = () => setModal(null);

  return (
    <div>
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Bancos</h1>
        <Button variant="success" onClick={() => setModal({ type: 'bank' })}>
          + Banco
        </Button>
      </header>

      {loading ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon="🏦"
            title="Nenhum banco cadastrado."
            description="Cadastre os bancos onde você tem conta, quanto guarda em cada um e as dívidas (cartão, empréstimo, cheque especial)."
            action={
              <Button variant="success" onClick={() => setModal({ type: 'bank' })}>
                + Adicionar banco
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="rumo-finance-summary">
            <div className="rumo-finance-summary-main">
              <span className="rumo-finance-summary-label">Patrimônio líquido</span>
              <span className="rumo-finance-summary-value">{formatCurrency(summary.netWorthCents)}</span>
            </div>
            <div className="rumo-finance-summary-row">
              <span>
                Guardado <strong>{formatCurrency(summary.savedCents)}</strong>
              </span>
              <span>
                Dívidas <strong>{formatCurrency(summary.debtCents)}</strong>
              </span>
            </div>
          </Card>

          <div className="rumo-bank-list">
            {sorted.map((bank) => {
              const bankDebt = (bank.debts ?? []).reduce((sum, d) => sum + d.balanceCents, 0);
              return (
                <Card key={bank.id} className="rumo-bank-card">
                  <button type="button" className="rumo-bank-header" onClick={() => setModal({ type: 'bank', bank })}>
                    <span className="rumo-bank-name">🏦 {bank.name}</span>
                    <span className="rumo-form-link">Editar</span>
                  </button>
                  <div className="rumo-bank-figures">
                    <div>
                      <span className="rumo-bank-figure-label">Guardado</span>
                      <span className="rumo-bank-figure-value rumo-bank-figure-value--saved">
                        {formatCurrency(bank.balanceCents)}
                      </span>
                    </div>
                    <div>
                      <span className="rumo-bank-figure-label">Dívidas</span>
                      <span className={`rumo-bank-figure-value ${bankDebt > 0 ? 'rumo-bank-figure-value--debt' : ''}`}>
                        {formatCurrency(bankDebt)}
                      </span>
                    </div>
                  </div>

                  {(bank.debts ?? []).length > 0 && (
                    <ul className="rumo-debt-list">
                      {bank.debts.map((debt) => {
                        const payoff = payoffLabel(debt);
                        const details = [
                          debt.description ? DEBT_KIND_LABELS[debt.kind] : null,
                          debt.monthlyPaymentCents
                            ? `${formatCurrency(debt.monthlyPaymentCents)}/mês${debt.installmentsLeft ? ` · ${debt.installmentsLeft}x restantes` : ''}`
                            : null,
                          debt.interestRateMonthly ? `${formatRate(debt.interestRateMonthly)} a.m.` : null,
                          payoff,
                        ].filter(Boolean);
                        return (
                          <li key={debt.id}>
                            <button
                              type="button"
                              className="rumo-debt-item"
                              onClick={() => setModal({ type: 'debt', bank, debt })}
                            >
                              <span className="rumo-bill-main">
                                <span className="rumo-bill-name">{debtLabel(debt)}</span>
                                <span className="rumo-bill-amount">{formatCurrency(debt.balanceCents)}</span>
                              </span>
                              {details.length > 0 && <span className="rumo-bill-meta">{details.join(' · ')}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="rumo-form-link rumo-bank-add-debt"
                    onClick={() => setModal({ type: 'debt', bank })}
                  >
                    + Adicionar dívida
                  </button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={close}
        title={
          modal?.type === 'debt'
            ? `${modal.debt ? 'Editar dívida' : 'Nova dívida'} · ${modal.bank.name}`
            : modal?.bank
              ? 'Editar banco'
              : 'Novo banco'
        }
      >
        {modal?.type === 'bank' && <BankForm key={modal.bank?.id ?? 'new'} bank={modal.bank} onDone={close} />}
        {modal?.type === 'debt' && (
          <DebtForm key={modal.debt?.id ?? 'new'} bank={modal.bank} debt={modal.debt} onDone={close} />
        )}
      </Modal>
    </div>
  );
}
