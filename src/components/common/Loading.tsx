import './Loading.css';

export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="rumo-loading">
      <div className="rumo-spinner" role="status" aria-label={label} />
      <span className="rumo-loading-label">{label}</span>
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number; width?: number | string; radius?: number }) {
  return (
    <div
      className="rumo-skeleton"
      style={{ height, width, borderRadius: radius ?? 'var(--rumo-radius-sm)' }}
    />
  );
}
