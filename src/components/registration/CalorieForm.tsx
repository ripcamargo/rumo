import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { addCalorieEntry } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { defaultMealTypeForHour, mealTypeLabel } from '../../utils/labels';
import { MEAL_TYPES, type Food, type MealType } from '../../types';
import { Button } from '../common/Button';

const CUSTOM_FOOD = 'custom';

export function CalorieForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const navigate = useNavigate();

  const { data: foods } = useFirestoreCollection<Food>(user?.uid, 'foods', [], 0, 'name');

  const [mealType, setMealType] = useState<MealType>(() => defaultMealTypeForHour(new Date().getHours()));
  const [foodId, setFoodId] = useState(CUSTOM_FOOD);
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('');
  const [mealName, setMealName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFood = useMemo(() => foods.find((f) => f.id === foodId), [foods, foodId]);
  const quantityValue = Number(quantity.replace(',', '.'));
  const computedCalories = selectedFood && !Number.isNaN(quantityValue)
    ? Math.round(selectedFood.calories * quantityValue)
    : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    const value = selectedFood ? computedCalories : Number(calories.replace(',', '.'));
    const validQuantity = selectedFood ? quantityValue > 0 : true;
    if (!value || Number.isNaN(value) || value <= 0 || !validQuantity) {
      setError('Informe um valor de calorias válido.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addCalorieEntry(
        user.uid,
        {
          calories: value,
          mealType,
          mealName: selectedFood ? selectedFood.name : mealName || undefined,
        },
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

  function goToFoodManagement() {
    onDone();
    navigate('/alimentos');
  }

  return (
    <form className="rumo-form" onSubmit={handleSubmit}>
      <div>
        <label className="rumo-form-label" htmlFor="meal-type-select">
          Refeição
        </label>
        <select
          id="meal-type-select"
          className="rumo-form-select"
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
        >
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {mealTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="rumo-form-label" htmlFor="food-select">
          Alimento
        </label>
        <select
          id="food-select"
          className="rumo-form-select"
          value={foodId}
          onChange={(e) => setFoodId(e.target.value)}
        >
          <option value={CUSTOM_FOOD}>Personalizado (informar valor)</option>
          {foods.map((food) => (
            <option key={food.id} value={food.id}>
              {food.name} — {food.calories} kcal / {food.servingAmount} {food.servingUnit}
            </option>
          ))}
        </select>
      </div>

      {selectedFood ? (
        <div>
          <label className="rumo-form-label" htmlFor="quantity-input">
            Quantidade (porções de {selectedFood.servingAmount} {selectedFood.servingUnit})
          </label>
          <input
            id="quantity-input"
            className="rumo-form-input"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0.1}
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {computedCalories !== null && (
            <p className="rumo-form-food-total">Total: {computedCalories} kcal</p>
          )}
        </div>
      ) : (
        <>
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
              Descrição (opcional)
            </label>
            <input
              id="meal-name-input"
              className="rumo-form-input rumo-form-input-secondary"
              type="text"
              placeholder="Salada com frango"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
          </div>
        </>
      )}

      <button type="button" className="rumo-form-link" onClick={goToFoodManagement}>
        Gerenciar alimentos cadastrados
      </button>

      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
