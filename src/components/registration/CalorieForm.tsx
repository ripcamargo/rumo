import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { addCalorieEntry } from '../../services/firebase/firestore';
import { combineDayWithCurrentTime } from '../../utils/dates';
import { defaultMealTypeForHour, mealTypeLabel } from '../../utils/labels';
import { MEAL_TYPES, type Food, type FoodCategory, type MealType } from '../../types';
import { Button } from '../common/Button';

const OTHER_CATEGORY = 'outros' as const;
const OTHER_ICON = '📦';
const OTHER_LABEL = 'Outros';

type Screen = 'categories' | 'foods' | 'selected' | 'custom';
type ActiveCategory = string | typeof OTHER_CATEGORY | null;

export function CalorieForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedDate } = useSelectedDate();
  const navigate = useNavigate();

  const { data: foods } = useFirestoreCollection<Food>(user?.uid, 'foods', [], 0, 'name');
  const { data: categories } = useFirestoreCollection<FoodCategory>(
    user?.uid,
    'foodCategories',
    [],
    0,
    'name',
  );

  const [mealType, setMealType] = useState<MealType>(() => defaultMealTypeForHour(new Date().getHours()));
  const [screen, setScreen] = useState<Screen>('categories');
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(null);
  const [foodId, setFoodId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [calories, setCalories] = useState('');
  const [mealName, setMealName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesWithFoods = useMemo(
    () => categories.filter((c) => foods.some((f) => f.categoryId === c.id)),
    [categories, foods],
  );
  const hasUncategorized = useMemo(() => foods.some((f) => !f.categoryId), [foods]);
  const activeCategoryObj = useMemo(
    () => categories.find((c) => c.id === activeCategory),
    [categories, activeCategory],
  );

  const foodsInActiveCategory = useMemo(() => {
    if (activeCategory === OTHER_CATEGORY) return foods.filter((f) => !f.categoryId);
    return foods.filter((f) => f.categoryId === activeCategory);
  }, [foods, activeCategory]);

  const selectedFood = useMemo(() => foods.find((f) => f.id === foodId), [foods, foodId]);
  const quantityValue = Number(quantity.replace(',', '.'));
  const computedCalories = selectedFood && !Number.isNaN(quantityValue)
    ? Math.round(selectedFood.calories * quantityValue)
    : null;

  function openCategory(category: ActiveCategory) {
    setActiveCategory(category);
    setScreen('foods');
  }

  function openFood(food: Food) {
    setFoodId(food.id);
    setQuantity('1');
    setScreen('selected');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    let value: number | null = null;
    let name: string | undefined;

    if (screen === 'selected' && selectedFood) {
      value = computedCalories;
      if (!value || Number.isNaN(value) || value <= 0 || !(quantityValue > 0)) {
        setError('Informe uma quantidade válida.');
        return;
      }
      name = selectedFood.name;
    } else if (screen === 'custom') {
      value = Number(calories.replace(',', '.'));
      if (!value || Number.isNaN(value) || value <= 0) {
        setError('Informe um valor de calorias válido.');
        return;
      }
      name = mealName || undefined;
    } else {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addCalorieEntry(
        user.uid,
        { calories: value, mealType, mealName: name },
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

      {screen === 'categories' && (
        <div>
          <label className="rumo-form-label">Alimento</label>
          <div className="rumo-segmented">
            <button type="button" className="rumo-segmented-item" onClick={() => setScreen('custom')}>
              ✏️ Personalizado
            </button>
            {categoriesWithFoods.map((category) => (
              <button
                key={category.id}
                type="button"
                className="rumo-segmented-item"
                onClick={() => openCategory(category.id)}
              >
                {category.icon && `${category.icon} `}
                {category.name}
              </button>
            ))}
            {hasUncategorized && (
              <button
                type="button"
                className="rumo-segmented-item"
                onClick={() => openCategory(OTHER_CATEGORY)}
              >
                {OTHER_ICON} {OTHER_LABEL}
              </button>
            )}
          </div>
          {foods.length === 0 && (
            <p style={{ margin: 'var(--rumo-space-2) 0 0', color: 'var(--rumo-text-secondary)', fontSize: 'var(--rumo-fs-sm)' }}>
              Nenhum alimento cadastrado ainda.
            </p>
          )}
        </div>
      )}

      {screen === 'foods' && (
        <div>
          <button
            type="button"
            className="rumo-form-link"
            onClick={() => {
              setScreen('categories');
              setActiveCategory(null);
            }}
          >
            ‹ Voltar
          </button>
          <label className="rumo-form-label" style={{ marginTop: 'var(--rumo-space-2)' }}>
            {activeCategory === OTHER_CATEGORY
              ? `${OTHER_ICON} ${OTHER_LABEL}`
              : activeCategoryObj && `${activeCategoryObj.icon ? `${activeCategoryObj.icon} ` : ''}${activeCategoryObj.name}`}
          </label>
          <div className="rumo-segmented">
            {foodsInActiveCategory.map((food) => (
              <button
                key={food.id}
                type="button"
                className="rumo-segmented-item"
                onClick={() => openFood(food)}
              >
                {food.name} · {food.calories} kcal/{food.servingAmount}{food.servingUnit}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === 'selected' && selectedFood && (
        <div>
          <button
            type="button"
            className="rumo-form-link"
            onClick={() => {
              setScreen('foods');
              setFoodId(null);
            }}
          >
            ‹ Trocar alimento
          </button>
          <label
            className="rumo-form-label"
            htmlFor="quantity-input"
            style={{ marginTop: 'var(--rumo-space-2)' }}
          >
            {selectedFood.name} — Quantidade (porções de {selectedFood.servingAmount}{' '}
            {selectedFood.servingUnit})
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
      )}

      {screen === 'custom' && (
        <>
          <button type="button" className="rumo-form-link" onClick={() => setScreen('categories')}>
            ‹ Voltar
          </button>
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

      {screen === 'categories' && (
        <button type="button" className="rumo-form-link" onClick={goToFoodManagement}>
          Gerenciar alimentos cadastrados
        </button>
      )}

      {error && <p className="rumo-form-error">{error}</p>}

      {(screen === 'selected' || screen === 'custom') && (
        <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      )}
    </form>
  );
}
