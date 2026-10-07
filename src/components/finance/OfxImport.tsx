import { useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  getTransactionIdsBetween,
  importTransactions,
  type NewTransaction,
} from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { decodeOfx, parseOfx } from '../../utils/ofx';
import { categorize, normalizeDescription, transactionDocId } from '../../utils/transactions';
import { formatCurrency, toMonthKey } from '../../utils/finance';
import { formatShortDate } from '../../utils/dates';
import './finance.css';

interface StatementPreview {
  fileName: string;
  accountLabel: string;
  from: Date;
  to: Date;
  total: number;
  fresh: NewTransaction[];
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

async function readStatement(userId: string, file: File, rules: Map<string, string>): Promise<StatementPreview> {
  const statement = parseOfx(decodeOfx(await file.arrayBuffer()));
  if (statement.transactions.length === 0) throw new Error('nenhuma transação encontrada no arquivo.');

  const times = statement.transactions.map((t) => t.date.getTime());
  const from = new Date(Math.min(...times));
  const to = new Date(Math.max(...times));
  const existing = await getTransactionIdsBetween(userId, from, to);

  const fresh = statement.transactions
    .map((t): NewTransaction => {
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
    })
    .filter((t) => !existing.has(t.id));

  return {
    fileName: file.name,
    accountLabel: statement.accountLabel,
    from,
    to,
    total: statement.transactions.length,
    fresh,
  };
}

export function OfxImport({ rules, onImported }: OfxImportProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!user || !files?.length) return;
    setReading(true);
    const statements: StatementPreview[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        statements.push(await readStatement(user.uid, file, rules));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'não foi possível ler o arquivo.';
        errors.push(`${file.name}: ${message}`);
      }
    }
    setReading(false);
    setPreview({ statements, errors });
    if (inputRef.current) inputRef.current.value = '';
  }

  const fresh = preview?.statements.flatMap((s) => s.fresh) ?? [];
  // Uma transação pode aparecer em dois arquivos sobrepostos da mesma conta.
  const unique = [...new Map(fresh.map((t) => [t.id, t])).values()];
  const expenses = unique.filter((t) => t.amountCents < 0).reduce((sum, t) => sum - t.amountCents, 0);
  const income = unique.filter((t) => t.amountCents > 0).reduce((sum, t) => sum + t.amountCents, 0);

  async function handleConfirm() {
    if (!user || unique.length === 0) return;
    setSaving(true);
    try {
      await importTransactions(user.uid, unique);
      const latest = unique.reduce((a, b) => (a.date > b.date ? a : b));
      showToast(`${unique.length} ${unique.length === 1 ? 'transação importada' : 'transações importadas'}`);
      setPreview(null);
      onImported(toMonthKey(latest.date));
    } catch {
      showToast('Não foi possível importar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="success" disabled={reading} onClick={() => inputRef.current?.click()}>
        {reading ? 'Lendo...' : '📥 Importar OFX'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.OFX,application/x-ofx"
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
                    : `${s.fresh.length} novas · ${s.total - s.fresh.length} já importadas`}
                </span>
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
