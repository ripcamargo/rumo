import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  updateCalorieEntry,
  updateExercise,
  updateWaterEntry,
  updateWeightEntry,
} from '../../services/firebase/firestore';
import { mealTypeLabel } from '../../utils/labels';
import { MEAL_TYPES, type CalorieEntry, type Exercise, type MealType, type WaterEntry, type WeightEntry } from '../../types';
import { Button } from '../common/Button';
import '../registration/QuickRegister.css';
import './cards.css';

export function WeightEntryEditForm({ entry, onDone }: { entry: WeightEntry; onDone: () => void }) {
  const { user } = useAuth();
  const [weight, setWeight] = useState(String(entry.weight));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = Number(weight.replace(',', '.'));
    if (!user || Number.isNaN(value) || value <= 0) {
      setError('Informe um peso válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWeightEntry(user.uid, entry.id, { weight: value });
      onDone();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rumo-log-edit-form">
      <input
        className="rumo-form-input rumo-form-input-secondary"
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0.1}
        autoFocus
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      {error && <p className="rumo-form-error">{error}</p>}
      <div className="rumo-log-edit-actions">
        <button type="button" className="rumo-form-link" onClick={onDone}>
          Cancelar
        </button>
        <Button size="md" variant="success" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

export function WaterEntryEditForm({ entry, onDone }: { entry: WaterEntry; onDone: () => void }) {
  const { user } = useAuth();
  const [amountMl, setAmountMl] = useState(String(entry.amountMl));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = Number(amountMl.replace(',', '.'));
    if (!user || Number.isNaN(value) || value <= 0) {
      setError('Informe uma quantidade válida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWaterEntry(user.uid, entry.id, { amountMl: value });
      onDone();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rumo-log-edit-form">
      <input
        className="rumo-form-input rumo-form-input-secondary"
        type="number"
        inputMode="numeric"
        min={1}
        autoFocus
        value={amountMl}
        onChange={(e) => setAmountMl(e.target.value)}
      />
      {error && <p className="rumo-form-error">{error}</p>}
      <div className="rumo-log-edit-actions">
        <button type="button" className="rumo-form-link" onClick={onDone}>
          Cancelar
        </button>
        <Button size="md" variant="success" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

export function CalorieEntryEditForm({ entry, onDone }: { entry: CalorieEntry; onDone: () => void }) {
  const { user } = useAuth();
  const [calories, setCalories] = useState(String(entry.calories));
  const [mealType, setMealType] = useState<MealType | ''>(entry.mealType ?? '');
  const [mealName, setMealName] = useState(entry.mealName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const value = Number(calories.replace(',', '.'));
    if (!user || Number.isNaN(value) || value <= 0) {
      setError('Informe um valor de calorias válido.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCalorieEntry(user.uid, entry.id, {
        calories: value,
        mealType: mealType || null,
        mealName: mealName.trim() || null,
      });
      onDone();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rumo-log-edit-form">
      <div className="rumo-log-edit-row">
        <input
          className="rumo-form-input rumo-form-input-secondary"
          type="number"
          inputMode="numeric"
          min={1}
          autoFocus
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
        <select
          className="rumo-form-select"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType | '')}
        >
          <option value="">Sem refeição</option>
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {mealTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>
      <input
        className="rumo-form-input rumo-form-input-secondary"
        type="text"
        placeholder="Descrição (opcional)"
        value={mealName}
        onChange={(e) => setMealName(e.target.value)}
      />
      {error && <p className="rumo-form-error">{error}</p>}
      <div className="rumo-log-edit-actions">
        <button type="button" className="rumo-form-link" onClick={onDone}>
          Cancelar
        </button>
        <Button size="md" variant="success" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

export function ExerciseEntryEditForm({ entry, onDone }: { entry: Exercise; onDone: () => void }) {
  const { user } = useAuth();
  const [activity, setActivity] = useState(entry.activity);
  const [durationMinutes, setDurationMinutes] = useState(String(entry.durationMinutes));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const minutes = Number(durationMinutes.replace(',', '.'));
    if (!user || !activity.trim() || Number.isNaN(minutes) || minutes <= 0) {
      setError('Informe a atividade e a duração.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateExercise(user.uid, entry.id, { activity: activity.trim(), durationMinutes: minutes });
      onDone();
    } catch {
      setError('Não foi possível salvar agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rumo-log-edit-form">
      <div className="rumo-log-edit-row">
        <input
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          autoFocus
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
        />
        <input
          className="rumo-form-input rumo-form-input-secondary"
          type="number"
          inputMode="numeric"
          min={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <div className="rumo-log-edit-actions">
        <button type="button" className="rumo-form-link" onClick={onDone}>
          Cancelar
        </button>
        <Button size="md" variant="success" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
