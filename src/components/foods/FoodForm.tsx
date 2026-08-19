import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addFood, updateFood } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import { FOOD_CATEGORIES, type Food, type FoodCategory } from '../../types';
import { foodCategoryIcon, foodCategoryLabel } from '../../utils/labels';
import '../registration/QuickRegister.css';

const SERVING_UNITS = ['unid.', 'g', 'ml'];

export function FoodForm({ food, onDone }: { food?: Food; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(food?.name ?? '');
  const [calories, setCalories] = useState(food ? String(food.calories) : '');
  const [servingAmount, setServingAmount] = useState(food ? String(food.servingAmount) : '100');
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'g');
  const [category, setCategory] = useState<FoodCategory | ''>(food?.category ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servingUnitOptions = SERVING_UNITS.includes(servingUnit)
    ? SERVING_UNITS
    : [servingUnit, ...SERVING_UNITS];

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
        await updateFood(user.uid, food.id, { ...data, category: category || null });
      } else {
        await addFood(user.uid, { ...data, category: category || undefined });
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
      <div className="rumo-form-row-3">
        <div>
          <label className="rumo-form-label" htmlFor="food-calories-input">
            Calorias
          </label>
          <input
            id="food-calories-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="90"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="food-serving-amount-input">
            Porção
          </label>
          <input
            id="food-serving-amount-input"
            className="rumo-form-input rumo-form-input-secondary"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0.1}
            placeholder="100"
            value={servingAmount}
            onChange={(e) => setServingAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="rumo-form-label" htmlFor="food-serving-unit-select">
            Unidade
          </label>
          <select
            id="food-serving-unit-select"
            className="rumo-form-select"
            value={servingUnit}
            onChange={(e) => setServingUnit(e.target.value)}
          >
            {servingUnitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="food-category-select">
          Categoria (opcional)
        </label>
        <select
          id="food-category-select"
          className="rumo-form-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as FoodCategory | '')}
        >
          <option value="">Sem categoria</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {foodCategoryIcon(c)} {foodCategoryLabel(c)}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
