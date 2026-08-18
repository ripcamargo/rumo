import { useEffect, type ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="rumo-modal-backdrop" onClick={onClose}>
      <div
        className="rumo-modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rumo-modal-handle" />
        <div className="rumo-modal-header">
          <h2 className="rumo-modal-title">{title}</h2>
          <button type="button" className="rumo-modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="rumo-modal-body">{children}</div>
      </div>
    </div>
  );
}
