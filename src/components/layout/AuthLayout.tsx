import type { ReactNode } from 'react';
import { Logo } from '../common/Logo';
import './AuthLayout.css';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rumo-auth-layout rumo-safe-top rumo-safe-bottom">
      <div className="rumo-auth-card">
        <div className="rumo-auth-logo">
          <Logo variant="full" height={88} />
        </div>
        <h1 className="rumo-auth-title">{title}</h1>
        {subtitle && <p className="rumo-auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
