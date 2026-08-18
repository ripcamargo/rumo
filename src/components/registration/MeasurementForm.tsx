import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addBodyMeasurement } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { Button } from '../common/Button';
import { MEASUREMENT_TYPES, type MeasurementType } from '../../types';
import { measurementLabel } from '../../utils/labels';

export function MeasurementForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const [type, setType] = useState<MeasurementType>('cintura');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numeric = Number(value.replace(',', '.'));
    if (!user || !value || Number.isNaN(numeric) || numeric <= 0) {
      setError('Informe um valor válido em cm.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addBodyMeasurement(user.uid, type, numeric, combineDayWithCurrentTime(selectedDate));
      showToast(`${measurementLabel(type)}: ${numeric} cm registrado`);
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
        <label className="rumo-form-label">Local</label>
        <div className="rumo-segmented">
          {MEASUREMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`rumo-segmented-item ${type === t ? 'rumo-segmented-item--active' : ''}`}
              onClick={() => setType(t)}
            >
              {measurementLabel(t)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="measurement-value-input">
          Valor (cm)
        </label>
        <input
          id="measurement-value-input"
          className="rumo-form-input"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={1}
          placeholder="101"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
