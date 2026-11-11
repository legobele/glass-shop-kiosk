import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { t } from '../../i18n';

// Each link declares the permission it needs; the nav renders only what the role can do.
const LINKS = [
  { to: '/admin', labelKey: 'adminOrders', end: true, perm: 'orders:read' },
  { to: '/admin/coordinator', labelKey: 'adminCoordinator', perm: 'jobs:read' },
  { to: '/admin/catalog', labelKey: 'adminCatalog', perm: 'catalog:read' },
  { to: '/admin/settings', labelKey: 'adminSettings', perm: 'settings:read' },
  { to: '/admin/users', labelKey: 'adminUsers', perm: 'users:manage' },
];

export default function AdminLayout() {
  const { profile } = useAuth();
  const { can } = usePermissions();
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
            Quality Glass <span className="muted" style={{ color: 'rgba(255,255,255,0.5)' }}>/ admin</span>
          </NavLink>
          <nav className="row" style={{ gap: 6, flex: 1 }}>
            {LINKS.filter((l) => can(l.perm)).map((l) => (
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
            {profile?.role && <span style={{ opacity: 0.6 }}> · {profile.role}</span>}
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
