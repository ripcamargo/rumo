import { useState } from 'react';
import { where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { Modal } from '../components/common/Modal';
import { MonthNav } from '../components/finance/MonthNav';
import { ExtraIncomeForm, IncomeItemForm } from '../components/finance/IncomeForms';
import { formatCurrency, toMonthKey } from '../utils/finance';
import { formatShortDate } from '../utils/dates';
import { INCOME_KIND_LABELS, summarizeIncome } from '../utils/financePlanning';
import type { ExtraIncome, IncomeItem, IncomeItemKind } from '../types';
import '../components/finance/finance.css';

type ModalState =
  | { type: 'item'; kind: IncomeItemKind; item?: IncomeItem }
  | { type: 'extra'; income?: ExtraIncome }
  | null;

const KINDS: IncomeItemKind[] = ['salary', 'benefit', 'deduction'];

export default function FinanceIncome() {
  const { user } = useAuth();
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [modal, setModal] = useState<ModalState>(null);

  const { data: items, loading } = useFirestoreCollection<IncomeItem>(user?.uid, 'incomeItems', [], 0, 'createdAt');
  const { data: extras } = useFirestoreCollection<ExtraIncome>(
    user?.uid,
    'extraIncomes',
    [where('month', '==', month)],
    month,
    null,
  );

  const summary = summarizeIncome(items);
  const sortedExtras = [...extras].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  const extrasTotal = extras.reduce((sum, e) => sum + e.amountCents, 0);
  const close = () => setModal(null);

  return (
    <div>
      <header className="rumo-finance-header">
        <h1 className="rumo-page-title">Renda</h1>
        <Button variant="success" onClick={() => setModal({ type: 'extra' })}>
          + Entrada avulsa
        </Button>
      </header>

      {loading ? (
        <Loading />
      ) : (
        <>
          <Card className="rumo-finance-summary">
            <div className="rumo-finance-summary-main">
              <span className="rumo-finance-summary-label">Você realmente ganha por mês</span>
              <span className="rumo-finance-summary-value">{formatCurrency(summary.netCents)}</span>
            </div>
            <div className="rumo-income-breakdown">
              <span>Salário bruto</span>
              <strong>{formatCurrency(summary.grossCents)}</strong>
              <span>+ Benefícios</span>
              <strong>{formatCurrency(summary.benefitsCents)}</strong>
              <span>− Descontos</span>
              <strong>{formatCurrency(summary.deductionsCents)}</strong>
            </div>
            {summary.nonCashBenefitsCents > 0 && (
              <span className="rumo-finance-summary-count">
                Em conta: {formatCurrency(summary.netCashCents)} · em cartões benefício (VR/VA):{' '}
                {formatCurrency(summary.nonCashBenefitsCents)}
              </span>
            )}
          </Card>

          {KINDS.map((kind) => {
            const kindItems = items.filter((i) => i.kind === kind);
            const label = INCOME_KIND_LABELS[kind];
            return (
              <section key={kind} className="rumo-income-section">
                <div className="rumo-spending-list-header">
                  <h2 className="rumo-spending-title">{label.title}</h2>
                  <button type="button" className="rumo-form-link" onClick={() => setModal({ type: 'item', kind })}>
                    + Adicionar {label.singular}
                  </button>
                </div>
                {kindItems.length === 0 ? (
                  <p className="rumo-finance-subtitle">
                    {kind === 'salary'
                      ? 'Comece pelo salário bruto do seu holerite.'
                      : kind === 'benefit'
                        ? 'VR, VA, auxílios e outros benefícios mensais.'
                        : 'INSS, IR, plano de saúde, consignado e outros descontos em folha.'}
                  </p>
                ) : (
                  <Card padded={false}>
                    <ul className="rumo-bill-list">
                      {kindItems.map((item) => (
                        <li key={item.id} className="rumo-bill">
                          <button
                            type="button"
                            className="rumo-bill-body"
                            onClick={() => setModal({ type: 'item', kind, item })}
                          >
                            <span className="rumo-bill-main">
                              <span className="rumo-bill-name">
                                {item.name}
                                {kind === 'benefit' && item.inCash === false && (
                                  <span className="rumo-bill-tag">cartão</span>
                                )}
                              </span>
                              <span className={`rumo-bill-amount ${kind === 'deduction' ? '' : 'rumo-tx-amount--in'}`}>
                                {kind === 'deduction' ? '−' : '+'} {formatCurrency(item.amountCents)}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </section>
            );
          })}

          <section className="rumo-income-section">
            <h2 className="rumo-spending-title">Entradas avulsas</h2>
            <MonthNav month={month} onChange={setMonth} />
            {sortedExtras.length === 0 ? (
              <p className="rumo-finance-subtitle">
                Nenhuma entrada extra neste mês. Registre vendas, freelas, reembolsos e outras rendas.
              </p>
            ) : (
              <>
                <p className="rumo-finance-subtitle">
                  Total do mês: <strong>{formatCurrency(extrasTotal)}</strong>
                </p>
                <Card padded={false}>
                  <ul className="rumo-bill-list">
                    {sortedExtras.map((income) => (
                      <li key={income.id} className="rumo-bill">
                        <button
                          type="button"
                          className="rumo-bill-body"
                          onClick={() => setModal({ type: 'extra', income })}
                        >
                          <span className="rumo-bill-main">
                            <span className="rumo-bill-name">{income.description}</span>
                            <span className="rumo-bill-amount rumo-tx-amount--in">
                              + {formatCurrency(income.amountCents)}
                            </span>
                          </span>
                          <span className="rumo-bill-meta">{formatShortDate(income.date.toDate())}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}
          </section>
        </>
      )}

      <Modal
        open={modal !== null}
        onClose={close}
        title={
          modal?.type === 'item'
            ? `${modal.item ? 'Editar' : 'Adicionar'} ${INCOME_KIND_LABELS[modal.kind].singular}`
            : modal?.income
              ? 'Editar entrada'
              : 'Nova entrada avulsa'
        }
      >
        {modal?.type === 'item' && (
          <IncomeItemForm key={modal.item?.id ?? modal.kind} kind={modal.kind} item={modal.item} onDone={close} />
        )}
        {modal?.type === 'extra' && (
          <ExtraIncomeForm key={modal.income?.id ?? 'new'} month={month} income={modal.income} onDone={close} />
        )}
      </Modal>
    </div>
  );
}
