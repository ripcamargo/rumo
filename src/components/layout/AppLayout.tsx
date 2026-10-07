import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { QuickRegister } from '../registration/QuickRegister';
import { useQuickRegister } from '../../contexts/QuickRegisterContext';
import './AppLayout.css';

const HEALTH_NAV_ITEMS = [
  { to: '/', label: 'Hoje', icon: '🏠', end: true },
  { to: '/historico', label: 'Progresso', icon: '📊', end: false },
  { to: '/configuracoes', label: 'Ajustes', icon: '⚙️', end: false },
];

const FINANCE_NAV_ITEMS = [
  { to: '/financas', label: 'Painel', icon: '🧭', end: true },
  { to: '/financas/contas', label: 'Contas', icon: '💸', end: false },
  { to: '/financas/gastos', label: 'Gastos', icon: '📊', end: false },
  { to: '/financas/bancos', label: 'Bancos', icon: '🏦', end: false },
  { to: '/financas/renda', label: 'Renda', icon: '💼', end: false },
];

export function AppLayout() {
  const { open } = useQuickRegister();
  const { pathname } = useLocation();
  // O módulo é derivado da rota: tudo sob /financas pertence ao módulo Finanças.
  const isFinance = pathname.startsWith('/financas');
  const navItems = isFinance ? FINANCE_NAV_ITEMS : HEALTH_NAV_ITEMS;

  return (
    <div className="rumo-layout">
      <header className="rumo-header rumo-safe-top">
        <div className="rumo-header-inner">
          <Logo variant="mark" height={30} />
          <span className="rumo-header-title">Rumo</span>
          <nav className="rumo-module-switch" aria-label="Módulo">
            <NavLink
              to="/"
              className={`rumo-module-switch-item ${isFinance ? '' : 'rumo-module-switch-item--active'}`}
            >
              🌱 Saúde
            </NavLink>
            <NavLink
              to="/financas"
              className={`rumo-module-switch-item ${isFinance ? 'rumo-module-switch-item--active' : ''}`}
            >
              💰 Finanças
            </NavLink>
          </nav>
          <nav className="rumo-header-nav">
            {navItems.map((item) => (
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
          {!isFinance && (
            <button
              type="button"
              className="rumo-header-cta"
              onClick={() => open()}
            >
              + Registrar
            </button>
          )}
        </div>
      </header>

      <main className="rumo-main">
        <div className="rumo-main-inner">
          <Outlet />
        </div>
      </main>

      {/* No módulo Finanças cada página renderiza o próprio botão de adicionar. */}
      {!isFinance && (
        <button
          type="button"
          className="rumo-fab"
          aria-label="Registrar"
          onClick={() => open()}
        >
          +
        </button>
      )}

      <nav className="rumo-bottom-nav rumo-safe-bottom">
        {navItems.map((item) => (
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
