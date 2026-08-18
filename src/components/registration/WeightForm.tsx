import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addWeightEntry } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { Button } from '../common/Button';

export function WeightForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(weight.replace(',', '.'));
    if (!user || !weight || Number.isNaN(value) || value <= 0) {
      setError('Informe um peso válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addWeightEntry(user.uid, value, combineDayWithCurrentTime(selectedDate));
      showToast(`Peso de ${value.toLocaleString('pt-BR')} kg registrado`);
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="weight-input">
          Peso (kg)
        </label>
        <input
          id="weight-input"
          className="rumo-form-input"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={1}
          placeholder="92,8"
          autoFocus
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
