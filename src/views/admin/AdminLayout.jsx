import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { t } from '../../i18n';

const LINKS = [
  { to: '/admin', labelKey: 'adminOrders', end: true },
  { to: '/admin/coordinator', labelKey: 'adminCoordinator' },
  { to: '/admin/catalog', labelKey: 'adminCatalog' },
  { to: '/admin/settings', labelKey: 'adminSettings' },
  { to: '/admin/users', labelKey: 'adminUsers', adminOnly: true },
];

export default function AdminLayout() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="page">
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(11,17,32,0.75)',
          backdropFilter: 'blur(16px) saturate(160%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="page-main" style={{ maxWidth: 1200, display: 'flex', alignItems: 'center', gap: 20, paddingTop: 12, paddingBottom: 12 }}>
          <NavLink to="/admin" style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '0.02em', textDecoration: 'none' }}>
            QGI <span className="muted" style={{ color: 'rgba(255,255,255,0.5)' }}>/ admin</span>
          </NavLink>
          <nav className="row" style={{ gap: 6, flex: 1 }}>
            {LINKS.filter((l) => !l.adminOnly || profile?.role === 'admin').map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                style={({ isActive }) => ({
                  padding: '7px 14px',
                  borderRadius: 40,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                  background: isActive ? 'var(--glass-deep)' : 'transparent',
                  textDecoration: 'none',
                })}
              >
                {t('en', l.labelKey)}
              </NavLink>
            ))}
          </nav>
          <span className="muted" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
            {profile?.displayName || profile?.email}
          </span>
          <button className="btn btn-ghost" onClick={logout} style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
            {t('en', 'logout')}
          </button>
        </div>
      </header>
      <div className="page-main">
        <Outlet />
      </div>
    </div>
  );
}
