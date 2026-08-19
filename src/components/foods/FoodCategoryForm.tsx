import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { addFoodCategory, updateFoodCategory } from '../../services/firebase/firestore';
import { Button } from '../common/Button';
import type { FoodCategory } from '../../types';
import '../registration/QuickRegister.css';

const ICON_SUGGESTIONS = ['🍎', '🥦', '🍽️', '🍔', '🥤', '🧀', '🍗', '🌾', '🍰', '🍿', '🥗', '🍕', '🍩', '🥑'];

export function FoodCategoryForm({ category, onDone }: { category?: FoodCategory; onDone: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) {
      setError('Informe um nome para a categoria.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (category) {
        await updateFoodCategory(user.uid, category.id, { name: name.trim(), icon: icon.trim() || null });
      } else {
        await addFoodCategory(user.uid, { name: name.trim(), icon: icon.trim() || undefined });
      }
      showToast(category ? 'Categoria atualizada' : 'Categoria cadastrada');
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
        <label className="rumo-form-label" htmlFor="category-name-input">
          Nome da categoria
        </label>
        <input
          id="category-name-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="Frutas"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="rumo-form-label" htmlFor="category-icon-input">
          Ícone (opcional)
        </label>
        <input
          id="category-icon-input"
          className="rumo-form-input rumo-form-input-secondary"
          type="text"
          placeholder="🍎"
          maxLength={4}
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
        <div className="rumo-segmented" style={{ marginTop: 'var(--rumo-space-2)' }}>
          {ICON_SUGGESTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`rumo-segmented-item ${icon === emoji ? 'rumo-segmented-item--active' : ''}`}
              onClick={() => setIcon(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="rumo-form-error">{error}</p>}
      <Button type="submit" variant="success" size="lg" fullWidth disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
