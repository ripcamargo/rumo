import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addWaterEntry } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { Button } from '../common/Button';

const QUICK_AMOUNTS = [250, 500, 750];

export function WaterForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: number) {
    if (!user || Number.isNaN(value) || value <= 0) {
      setError('Informe uma quantidade válida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addWaterEntry(user.uid, value, combineDayWithCurrentTime(selectedDate));
      showToast(`${value} ml de água registrados`);
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void save(Number(amount.replace(',', '.')));
  }

  return (
    <div className="rumo-form">
      <div className="rumo-quick-amounts">
        {QUICK_AMOUNTS.map((value) => (
          <button
            key={value}
            type="button"
            className="rumo-quick-amount-btn"
            disabled={saving}
            onClick={() => void save(value)}
          >
            +{value} ml
          </button>
        ))}
      </div>
      <form className="rumo-form" onSubmit={handleSubmit}>
        <div>
          <label className="rumo-form-label" htmlFor="water-amount-input">
            Outra quantidade (ml)
          </label>
          <input
            id="water-amount-input"
            className="rumo-form-input"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="330"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        {error && <p className="rumo-form-error">{error}</p>}
        <Button type="submit" variant="success" size="lg" fullWidth disabled={saving || !amount}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  );
}
