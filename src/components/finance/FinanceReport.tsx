import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getAllFinanceData } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { toMonthKey } from '../../utils/finance';
import { buildFinanceReport } from '../../utils/financeReport';
import '../registration/QuickRegister.css';
import './finance.css';

/** Botão discreto do Painel que gera um relatório em texto de todos os dados financeiros. */
export function FinanceReportButton() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!user) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const data = await getAllFinanceData(user.uid);
      setReport(buildFinanceReport(data, toMonthKey(new Date())));
    } catch {
      setError('Não foi possível gerar o relatório agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report);
      showToast('Relatório copiado');
    } catch {
      setError('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([report], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `rumo-financas-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        type="button"
        className="rumo-report-trigger"
        title="Gerar relatório completo para análise"
        aria-label="Gerar relatório financeiro completo"
        onClick={() => void generate()}
      >
        📋
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Relatório financeiro">
        <div className="rumo-form">
          <p className="rumo-form-hint">
            Tudo o que está cadastrado — renda, contas, bancos, dívidas e extratos. Copie e cole numa IA de apoio
            financeiro para uma análise completa.
          </p>
          {loading ? (
            <p className="rumo-finance-subtitle">Reunindo seus dados...</p>
          ) : (
            report && <textarea className="rumo-report-text" readOnly value={report} aria-label="Relatório" />
          )}
          {error && <p className="rumo-form-error">{error}</p>}
          <Button type="button" variant="success" size="lg" fullWidth disabled={loading || !report} onClick={() => void copy()}>
            Copiar relatório
          </Button>
          <Button type="button" variant="outline" fullWidth disabled={loading || !report} onClick={download}>
            Baixar arquivo .md
          </Button>
        </div>
      </Modal>
    </>
  );
}
