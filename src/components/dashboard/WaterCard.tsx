import { useState } from 'react';
import { Card } from '../common/Card';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addWaterEntry } from '../../services/firebase/firestore';
import './cards.css';

const QUICK_AMOUNTS = [250, 500, 750];

export function WaterCard({
  consumedMl,
  goalMl,
  recordedAt,
}: {
  consumedMl: number;
  goalMl: number;
  recordedAt: Date;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [savingAmount, setSavingAmount] = useState<number | null>(null);
  const progress = goalMl > 0 ? Math.min(consumedMl / goalMl, 1) : 0;

  async function handleQuickAdd(amount: number) {
    if (!user) return;
    setSavingAmount(amount);
    try {
      await addWaterEntry(user.uid, amount, recordedAt);
      showToast(`+${amount} ml de água`);
    } catch {
      showToast('Não foi possível registrar agora.', 'error');
    } finally {
      setSavingAmount(null);
    }
  }

  return (
    <Card className="rumo-metric-card">
      <div className="rumo-metric-card-header">
        <span className="rumo-metric-card-label">Água</span>
        <span className="rumo-metric-card-emoji" aria-hidden="true">
          💧
        </span>
      </div>
      <p className="rumo-metric-card-value">
        {(consumedMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}{' '}
        <span className="rumo-metric-card-value-goal">
          / {(goalMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L
        </span>
      </p>
      <div className="rumo-progress-track">
        <div className="rumo-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="rumo-water-quick-row">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="rumo-water-quick-btn"
            disabled={savingAmount !== null}
            onClick={() => void handleQuickAdd(amount)}
          >
            +{amount} ml
          </button>
        ))}
      </div>
    </Card>
  );
}
