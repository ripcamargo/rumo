import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div className={`rumo-card ${padded ? 'rumo-card--padded' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
