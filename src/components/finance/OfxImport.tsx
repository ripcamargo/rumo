import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import {
  applyStatementToBank,
  getTransactionsBetween,
  importTransactions,
  type NewTransaction,
} from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { BankReflectControl } from './BankReflectControl';
import { decodeOfx } from '../../utils/ofx';
import { parseStatementFile } from '../../utils/statement';
import {
  categorize,
  normalizeDescription,
  splitNewTransactions,
  transactionDocId,
  type TransactionFingerprint,
} from '../../utils/transactions';
import { formatCurrency, toMonthKey } from '../../utils/finance';
import { suggestReflection, type BankReflection } from '../../utils/financePlanning';
import { formatShortDate } from '../../utils/dates';
import type { Bank } from '../../types';
import './finance.css';

interface StatementPreview {
  fileName: string;
  accountLabel: string;
  isCreditCard: boolean;
  from: Date;
  to: Date;
  total: number;
  fresh: NewTransaction[];
  /** Mesmo dia, valor e descrição de uma já gravada (ou de outro arquivo desta importação). */
  similar: number;
}

interface Preview {
  statements: StatementPreview[];
  errors: string[];
}

interface OfxImportProps {
  /** Regras aprendidas (descrição normalizada → categoria). */
  rules: Map<string, string>;
  /** Chamado após importar, com o mês mais recente do extrato. */
  onImported: (month: string) => void;
}

async function readStatement(
  userId: string,
  file: File,
  rules: Map<string, string>,
  /** Transações já aceitas de arquivos anteriores desta mesma importação. */
  pending: TransactionFingerprint[],
): Promise<StatementPreview> {
  const statement = parseStatementFile(decodeOfx(await file.arrayBuffer()), file.name);
  if (statement.transactions.length === 0) throw new Error('nenhuma transação encontrada no arquivo.');

  const times = statement.transactions.map((t) => t.date.getTime());
  const from = new Date(Math.min(...times));
  const to = new Date(Math.max(...times));
  const existing = await getTransactionsBetween(userId, from, to);

  const incoming = statement.transactions.map((t): NewTransaction => {
    const { categoryId, source } = categorize(t.description, t.amountCents, rules);
    return {
      id: transactionDocId(statement.accountKey, t.fitId),
      date: t.date,
      amountCents: t.amountCents,
      description: t.description,
      descriptionKey: normalizeDescription(t.description),
      categoryId,
      categorySource: source,
      accountKey: statement.accountKey,
      accountLabel: statement.accountLabel,
      fitId: t.fitId,
    };
  });
  const { fresh, similar } = splitNewTransactions(incoming, [...existing, ...pending]);

  return {
    fileName: file.name,
    accountLabel: statement.accountLabel,
    isCreditCard: statement.isCreditCard,
    from,
    to,
    total: statement.transactions.length,
    fresh,
    similar,
  };
}

export function OfxImport({ rules, onImported }: OfxImportProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  // Por arquivo: em qual banco refletir. Sem entrada = não reflete (nada é automático).
  const [reflections, setReflections] = useState<Record<string, BankReflection>>({});
  const { data: banks } = useFirestoreCollection<Bank>(user?.uid, 'banks', [], 0, 'name');

  async function handleFiles(files: FileList | null) {
    if (!user || !files?.length) return;
    setReading(true);
    const statements: StatementPreview[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const pending = statements.flatMap((s) => s.fresh);
        statements.push(await readStatement(user.uid, file, rules, pending));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'não foi possível ler o arquivo.';
        errors.push(`${file.name}: ${message}`);
      }
    }
    setReading(false);
    setPreview({ statements, errors });
    setReflections({});
    if (inputRef.current) inputRef.current.value = '';
  }

  // Repetidas entre arquivos já saem em readStatement, que recebe o que os anteriores trouxeram.
  const unique = preview?.statements.flatMap((s) => s.fresh) ?? [];
  const expenses = unique.filter((t) => t.amountCents < 0).reduce((sum, t) => sum - t.amountCents, 0);
  const income = unique.filter((t) => t.amountCents > 0).reduce((sum, t) => sum + t.amountCents, 0);

  const netOf = (s: StatementPreview) => s.fresh.reduce((sum, t) => sum + t.amountCents, 0);

  function setReflection(fileName: string, value: BankReflection | null) {
    setReflections((current) => {
      const next = { ...current };
      if (value) next[fileName] = value;
      else delete next[fileName];
      return next;
    });
  }

  async function handleConfirm() {
    if (!user || !preview || unique.length === 0) return;
    setSaving(true);
    try {
      await importTransactions(user.uid, unique);
    } catch {
      showToast('Não foi possível importar agora. Tente novamente.', 'error');
      setSaving(false);
      return;
    }

    let bankFailed = false;
    for (const s of preview.statements) {
      const reflection = reflections[s.fileName];
      const net = netOf(s);
      if (!reflection || net === 0) continue;
      try {
        await applyStatementToBank(user.uid, reflection.bankId, reflection.target, net);
      } catch {
        bankFailed = true;
      }
    }

    const latest = unique.reduce((a, b) => (a.date > b.date ? a : b));
    const imported = `${unique.length} ${unique.length === 1 ? 'transação importada' : 'transações importadas'}`;
    if (bankFailed) {
      showToast(`${imported}, mas não foi possível atualizar Bancos. Ajuste o saldo por lá.`, 'error');
    } else {
      showToast(Object.keys(reflections).length > 0 ? `${imported} e Bancos atualizado` : imported);
    }
    setSaving(false);
    setPreview(null);
    onImported(toMonthKey(latest.date));
  }

  return (
    <>
      <Button variant="success" disabled={reading} onClick={() => inputRef.current?.click()}>
        {reading ? 'Lendo...' : '📥 Importar extrato'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.OFX,.txt,.TXT,.csv,.CSV,application/x-ofx,text/plain,text/csv"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <Modal open={preview !== null} onClose={() => setPreview(null)} title="Importar extrato">
        {preview && (
          <div className="rumo-form">
            {preview.statements.map((s) => (
              <div key={s.fileName} className="rumo-import-statement">
                <strong>{s.accountLabel}</strong>
                <span>
                  {formatShortDate(s.from)} a {formatShortDate(s.to)} · {s.total}{' '}
                  {s.total === 1 ? 'transação' : 'transações'}
                </span>
                <span>
                  {s.fresh.length === s.total
                    ? 'Todas novas'
                    : [
                        `${s.fresh.length} ${s.fresh.length === 1 ? 'nova' : 'novas'}`,
                        s.total - s.fresh.length - s.similar > 0 &&
                          `${s.total - s.fresh.length - s.similar} já importadas`,
                        s.similar > 0 &&
                          `${s.similar} ${s.similar === 1 ? 'igual a uma existente' : 'iguais a existentes'} (mesmo dia, valor e descrição)`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </span>
                {s.fresh.length > 0 && (
                  <BankReflectControl
                    id={`reflect-${s.fileName}`}
                    banks={banks}
                    netCents={netOf(s)}
                    value={reflections[s.fileName] ?? null}
                    onToggle={(enabled) =>
                      setReflection(s.fileName, enabled ? suggestReflection(banks, s.accountLabel, s.isCreditCard) : null)
                    }
                    onChange={(value) => setReflection(s.fileName, value)}
                  />
                )}
              </div>
            ))}

            {preview.errors.map((error) => (
              <p key={error} className="rumo-form-error">
                {error}
              </p>
            ))}

            {unique.length > 0 && (
              <div className="rumo-import-totals">
                <span>
                  Saídas <strong>{formatCurrency(expenses)}</strong>
                </span>
                <span>
                  Entradas <strong>{formatCurrency(income)}</strong>
                </span>
              </div>
            )}

            <p className="rumo-form-hint">
              As categorias são sugeridas automaticamente; corrija na lista e o Rumo aprende para as próximas
              importações.
            </p>

            <Button
              variant="success"
              size="lg"
              fullWidth
              disabled={saving || unique.length === 0}
              onClick={() => void handleConfirm()}
            >
              {saving
                ? 'Importando...'
                : unique.length === 0
                  ? 'Nada novo para importar'
                  : `Importar ${unique.length} ${unique.length === 1 ? 'transação' : 'transações'}`}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
