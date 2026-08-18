import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addCalorieEntry } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { Button } from '../common/Button';

export function CalorieForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const [calories, setCalories] = useState('');
  const [mealName, setMealName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(calories.replace(',', '.'));
    if (!user || !calories || Number.isNaN(value) || value <= 0) {
      setError('Informe um valor de calorias válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addCalorieEntry(
        user.uid,
        { calories: value, mealName: mealName || undefined },
        combineDayWithCurrentTime(selectedDate),
      );
      showToast(`${value} kcal registradas`);
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
        <label className="rumo-form-label" htmlFor="calories-input">
          Calorias (kcal)
        </label>
        <input
          id="calories-input"
          className="rumo-form-input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="450"
          autoFocus
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="meal-name-input">
          Refeição (opcional)
        </label>
        <input
          id="meal-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Almoço"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
        />
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
