import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { addFood, updateFood } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import type { Food, FoodCategory } from '../../types';
import '../registration/QuickRegister.css';

const SERVING_UNITS = ['unid.', 'g', 'ml'];

export function FoodForm({ food, onDone }: { food?: Food; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: categories } = useFirestoreCollection<FoodCategory>(
    user?.uid,
    'foodCategories',
    [],
    0,
    'name',
  );

  const [name, setName] = useState(food?.name ?? '');
  const [calories, setCalories] = useState(food ? String(food.calories) : '');
  const [servingAmount, setServingAmount] = useState(food ? String(food.servingAmount) : '100');
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'g');
  const [categoryId, setCategoryId] = useState(food?.categoryId ?? '');
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
        await updateFood(user.uid, food.id, { ...data, categoryId: categoryId || null });
      } else {
        await addFood(user.uid, { ...data, categoryId: categoryId || undefined });
      }
      showToast(food ? 'Alimento atualizado' : 'Alimento cadastrado');
      onDone();
    } catch {
      setError('Não foi possível salvar agora. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  function goToCategoryManagement() {
    onDone();
    navigate('/categorias-alimentos');
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
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon && `${category.icon} `}
              {category.name}
            </option>
          ))}
        </select>
        <button type="button" className="rumo-form-link" style={{ marginTop: 'var(--rumo-space-2)' }} onClick={goToCategoryManagement}>
          Gerenciar categorias
        </button>
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
