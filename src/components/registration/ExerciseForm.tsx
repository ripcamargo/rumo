import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addExercise } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { Button } from '../common/Button';

const SUGGESTIONS = ['Caminhada', 'Corrida', 'Academia', 'Futebol', 'Natação', 'Bicicleta'];

export function ExerciseForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const minutes = Number(duration.replace(',', '.'));
    if (!user || !activity.trim() || !duration || Number.isNaN(minutes) || minutes <= 0) {
      setError('Informe a atividade e a duração.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addExercise(
        user.uid,
        { activity: activity.trim(), durationMinutes: minutes },
        combineDayWithCurrentTime(selectedDate),
      );
      showToast(`${activity.trim()} registrado`);
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
        <label className="rumo-form-label" htmlFor="activity-input">
          Atividade
        </label>
        <input
          id="activity-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Caminhada"
          autoFocus
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
        <div className="rumo-segmented" style={{ marginTop: 'var(--rumo-space-2)' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`rumo-segmented-item ${activity === s ? 'rumo-segmented-item--active' : ''}`}
              onClick={() => setActivity(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="duration-input">
          Duração (minutos)
        </label>
        <input
          id="duration-input"
          className="rumo-form-input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="45"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
