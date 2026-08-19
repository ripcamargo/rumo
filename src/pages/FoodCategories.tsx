import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { addFoodCategory, deleteFoodCategory } from '../services/firebase/firestore';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { FoodCategoryForm } from '../components/foods/FoodCategoryForm';
import type { FoodCategory } from '../types';
import '../components/dashboard/cards.css';
import './Foods.css';

const SUGGESTED_CATEGORIES = [
  { name: 'Frutas', icon: '🍎' },
  { name: 'Legumes/Verduras', icon: '🥦' },
  { name: 'Comida', icon: '🍽️' },
  { name: 'Fast-food', icon: '🍔' },
  { name: 'Bebidas', icon: '🥤' },
  { name: 'Laticínios', icon: '🧀' },
  { name: 'Proteínas/Carnes', icon: '🍗' },
  { name: 'Grãos/Cereais', icon: '🌾' },
  { name: 'Doces/Sobremesas', icon: '🍰' },
  { name: 'Snacks/Petiscos', icon: '🍿' },
];

export default function FoodCategories() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: categories, loading } = useFirestoreCollection<FoodCategory>(
    user?.uid,
    'foodCategories',
    [],
    0,
    'name',
  );

  const [editing, setEditing] = useState<FoodCategory | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(category: FoodCategory) {
    setEditing(category);
    setFormOpen(true);
  }

  async function handleDelete(category: FoodCategory) {
    if (!user) return;
    setDeletingId(category.id);
    try {
      await deleteFoodCategory(user.uid, category.id);
      showToast('Categoria removida');
    } catch {
      showToast('Não foi possível remover agora. Tente novamente.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSeedSuggestions() {
    if (!user) return;
    setSeeding(true);
    try {
      await Promise.all(SUGGESTED_CATEGORIES.map((category) => addFoodCategory(user.uid, category)));
      showToast('Categorias sugeridas adicionadas');
    } catch {
      showToast('Não foi possível adicionar agora. Tente novamente.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <header className="rumo-history-header">
        <h1 className="rumo-page-title">Categorias de alimentos</h1>
        <Button variant="success" onClick={openNew}>
          + Nova categoria
        </Button>
      </header>

      {loading ? (
        <Loading />
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon="🏷️"
            title="Nenhuma categoria cadastrada."
            description="Crie categorias para organizar seus alimentos, ou use nossas sugestões."
            action={
              <div style={{ display: 'flex', gap: 'var(--rumo-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="success" onClick={openNew}>
                  + Nova categoria
                </Button>
                <Button variant="outline" disabled={seeding} onClick={() => void handleSeedSuggestions()}>
                  {seeding ? 'Adicionando...' : '✨ Usar sugestões'}
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="rumo-food-list">
            {categories.map((category) => (
              <li key={category.id} className="rumo-food-item">
                <span className="rumo-food-item-name">
                  {category.icon && `${category.icon} `}
                  {category.name}
                </span>
                <div className="rumo-food-item-actions">
                  <button
                    type="button"
                    className="rumo-food-item-action"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => openEdit(category)}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    className="rumo-food-item-action"
                    aria-label={`Remover ${category.name}`}
                    disabled={deletingId === category.id}
                    onClick={() => void handleDelete(category)}
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
        title={editing ? 'Editar categoria' : 'Nova categoria'}
      >
        <FoodCategoryForm category={editing} onDone={() => setFormOpen(false)} />
      </Modal>
    </div>
  );
}
