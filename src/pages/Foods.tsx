import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { deleteFood } from '../services/firebase/firestore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { FoodForm } from '../components/foods/FoodForm';
import { foodCategoryIcon, foodCategoryLabel } from '../utils/labels';
import type { Food } from '../types';
import '../components/dashboard/cards.css';
import './Foods.css';

export default function Foods() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: foods, loading } = useFirestoreCollection<Food>(user?.uid, 'foods', [], 0, 'name');

  const [editing, setEditing] = useState<Food | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(food: Food) {
    setEditing(food);
    setFormOpen(true);
  }

  async function handleDelete(food: Food) {
    if (!user) return;
    setDeletingId(food.id);
    try {
      await deleteFood(user.uid, food.id);
      showToast('Alimento removido');
    } catch {
      showToast('Não foi possível remover agora. Tente novamente.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <header className="rumo-history-header">
        <h1 className="rumo-page-title">Meus alimentos</h1>
        <Button variant="success" onClick={openNew}>
          + Novo alimento
        </Button>
      </header>

      {loading ? (
        <Loading />
      ) : foods.length === 0 ? (
        <Card>
          <EmptyState
            icon="🍎"
            title="Nenhum alimento cadastrado."
            description="Cadastre alimentos com as calorias por porção para registrar o consumo mais rápido."
            action={
              <Button variant="success" onClick={openNew}>
                + Novo alimento
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="rumo-food-list">
            {foods.map((food) => (
              <li key={food.id} className="rumo-food-item">
                <div>
                  <span className="rumo-food-item-name">
                    {food.category && `${foodCategoryIcon(food.category)} `}
                    {food.name}
                  </span>
                  <span className="rumo-food-item-detail">
                    {food.calories} kcal / {food.servingAmount} {food.servingUnit}
                    {food.category && ` · ${foodCategoryLabel(food.category)}`}
                  </span>
                </div>
                <div className="rumo-food-item-actions">
                  <button
                    type="button"
                    className="rumo-food-item-action"
                    aria-label={`Editar ${food.name}`}
                    onClick={() => openEdit(food)}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="rumo-food-item-action"
                    aria-label={`Remover ${food.name}`}
                    disabled={deletingId === food.id}
                    onClick={() => void handleDelete(food)}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Editar alimento' : 'Novo alimento'}
      >
        <FoodForm food={editing} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
