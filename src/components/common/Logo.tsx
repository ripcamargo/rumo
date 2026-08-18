interface LogoProps {
  variant?: 'full' | 'mark';
  height?: number;
  className?: string;
}

/**
 * Usa diretamente o arquivo oficial da marca (public/logo.png ou o ícone
 * derivado dele em public/icons). Nunca recriar o símbolo em CSS/SVG.
 */
export function Logo({ variant = 'full', height = 36, className = '' }: LogoProps) {
  const src = variant === 'full' ? '/logo.png' : '/icons/icon-512.png';
  return (
    <img
      src={src}
      alt="Rumo"
      height={height}
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}
