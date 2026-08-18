import type { ReactNode } from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rumo-empty-state">
      <span className="rumo-empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <p className="rumo-empty-state-title">{title}</p>
      {description && <p className="rumo-empty-state-description">{description}</p>}
      {action && <div className="rumo-empty-state-action">{action}</div>}
    </div>
  );
}
