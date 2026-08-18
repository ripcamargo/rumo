import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { QuickRegister } from '../registration/QuickRegister';
import { useQuickRegister } from '../../contexts/QuickRegisterContext';
import './AppLayout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Hoje', icon: '🏠', end: true },
  { to: '/historico', label: 'Progresso', icon: '📊', end: false },
  { to: '/configuracoes', label: 'Ajustes', icon: '⚙️', end: false },
];

export function AppLayout() {
  const { open } = useQuickRegister();

  return (
    <div className="rumo-layout">
      <header className="rumo-header rumo-safe-top">
        <div className="rumo-header-inner">
          <Logo variant="mark" height={30} />
          <span className="rumo-header-title">Rumo</span>
          <nav className="rumo-header-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rumo-header-link ${isActive ? 'rumo-header-link--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="rumo-header-cta"
            onClick={() => open()}
          >
            + Registrar
          </button>
        </div>
      </header>

      <main className="rumo-main">
        <div className="rumo-main-inner">
          <Outlet />
        </div>
      </main>

      <button
        type="button"
        className="rumo-fab"
        aria-label="Registrar"
        onClick={() => open()}
      >
        +
      </button>

      <nav className="rumo-bottom-nav rumo-safe-bottom">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rumo-bottom-nav-item ${isActive ? 'rumo-bottom-nav-item--active' : ''}`
            }
          >
            <span className="rumo-bottom-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <QuickRegister />
    </div>
  );
}
