import { useState, type ReactNode } from 'react';
import type { Timestamp } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { formatTime } from '../../utils/dates';
import './cards.css';

interface EntryLogModalProps<T extends { id: string; recordedAt: Timestamp }> {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  entries: T[];
  emptyMessage: string;
  renderSummary: (entry: T) => ReactNode;
  renderEditForm: (entry: T, onDone: () => void) => ReactNode;
  onDelete: (entry: T) => Promise<void>;
}

export function EntryLogModal<T extends { id: string; recordedAt: Timestamp }>({
  open,
  onClose,
  title,
  icon,
  entries,
  emptyMessage,
  renderSummary,
  renderEditForm,
  onDelete,
}: EntryLogModalProps<T>) {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(entry: T) {
    setDeletingId(entry.id);
    try {
      await onDelete(entry);
      showToast('Registro removido');
    } catch {
      showToast('Não foi possível remover agora. Tente novamente.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function handleClose() {
    setEditingId(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {entries.length === 0 ? (
        <EmptyState icon={icon} title={emptyMessage} />
      ) : (
        <ul className="rumo-log-list">
          {entries.map((entry) => (
            <li key={entry.id} className="rumo-log-item">
              {editingId === entry.id ? (
                renderEditForm(entry, () => setEditingId(null))
              ) : (
                <>
                  <div>
                    <span className="rumo-log-item-summary">{renderSummary(entry)}</span>
                    <span className="rumo-log-item-time">{formatTime(entry.recordedAt.toDate())}</span>
                  </div>
                  <div className="rumo-log-item-actions">
                    <button
                      type="button"
                      className="rumo-log-item-action"
                      aria-label="Editar registro"
                      onClick={() => setEditingId(entry.id)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="rumo-log-item-action"
                      aria-label="Remover registro"
                      disabled={deletingId === entry.id}
                      onClick={() => void handleDelete(entry)}
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
