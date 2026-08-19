import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addFood, updateFood } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import type { Food } from '../../types';
import '../registration/QuickRegister.css';

const SERVING_UNIT_SUGGESTIONS = ['g', 'ml', 'unidade', 'porção', 'fatia', 'copo'];

export function FoodForm({ food, onDone }: { food?: Food; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(food?.name ?? '');
  const [calories, setCalories] = useState(food ? String(food.calories) : '');
  const [servingAmount, setServingAmount] = useState(food ? String(food.servingAmount) : '100');
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'g');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const caloriesValue = Number(calories.replace(',', '.'));
    const servingAmountValue = Number(servingAmount.replace(',', '.'));
    if (
      !user ||
      !name.trim() ||
      !servingUnit.trim() ||
      Number.isNaN(caloriesValue) ||
      caloriesValue <= 0 ||
      Number.isNaN(servingAmountValue) ||
      servingAmountValue <= 0
    ) {
      setError('Preencha o nome, as calorias e a porção corretamente.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = {
        name: name.trim(),
        calories: caloriesValue,
        servingAmount: servingAmountValue,
        servingUnit: servingUnit.trim(),
      };
      if (food) {
        await updateFood(user.uid, food.id, data);
      } else {
        await addFood(user.uid, data);
      }
      showToast(food ? 'Alimento atualizado' : 'Alimento cadastrado');
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
        <label className="rumo-form-label" htmlFor="food-name-input">
          Nome do alimento
        </label>
        <input
          id="food-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Banana"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="food-calories-input">
          Calorias (kcal) por porção
        </label>
        <input
          id="food-calories-input"
          className="rumo-form-input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="90"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 'var(--rumo-space-3)' }}>
        <div style={{ flex: 1 }}>
          <label className="rumo-form-label" htmlFor="food-serving-amount-input">
            Porção
          </label>
          <input
            id="food-serving-amount-input"
            className="rumo-form-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0.1}
            placeholder="100"
            value={servingAmount}
            onChange={(e) => setServingAmount(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="rumo-form-label" htmlFor="food-serving-unit-input">
            Unidade
          </label>
          <input
            id="food-serving-unit-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="text"
            placeholder="g"
            list="food-serving-unit-suggestions"
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value)}
          />
          <datalist id="food-serving-unit-suggestions">
            {SERVING_UNIT_SUGGESTIONS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
