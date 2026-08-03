import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import { useToast } from '../../components/Toast';

const ROLES = ['admin', 'staff', 'installer', 'customer'];

// User management — admin only.
export default function UsersView() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const create = async () => {
    try {
      const fn = httpsCallable(functions, 'createUser');
      await fn({ email, password, displayName, role });
      toast.success(`User ${email} created`);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('staff');
    } catch (err) {
      toast.error(err?.message || 'Failed to create user');
    }
  };

  const setRoleOf = async (uid, newRole) => {
    try {
      const fn = httpsCallable(functions, 'setRole');
      await fn({ uid, role: newRole });
      toast.success('Role updated');
    } catch (err) {
      toast.error(err?.message || 'Failed to update role');
    }
  };

  const setTrustedOf = async (uid, trusted) => {
    try {
      const fn = httpsCallable(functions, 'setTrusted');
      await fn({ uid, trusted });
      toast.success(trusted ? 'Customer marked trusted' : 'Trusted removed');
    } catch (err) {
      toast.error(err?.message || 'Failed to update trusted');
    }
  };

  return (
    <div>
      <h2 className="page-title">{t('en', 'adminUsers')}</h2>
      <p className="page-sub">Create staff accounts and manage roles.</p>

      <div className="glass-card mb-3" style={{ padding: 20, maxWidth: 520 }}>
        <h4 className="mb-2">Create user</h4>
        <div className="field">
          <label>{t('en', 'displayName')}</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('en', 'emailLabel')}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('en', 'passwordLabel')}</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('en', 'roleLabel')}</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{t('en', 'role' + r[0].toUpperCase() + r.slice(1))}</option>
            ))}
          </select>
        </div>
        <Button onClick={create} disabled={!email || !password || password.length < 6}>
          {t('en', 'add')}
        </Button>
      </div>

      {loading ? (
        <p className="muted">{t('en', 'loading')}</p>
      ) : users.length === 0 ? (
        <p className="muted">{t('en', 'usersEmpty')}</p>
      ) : (
        <div className="table-wrap">
          <table className="qgi-table">
            <thead>
              <tr>
                <th>{t('en', 'displayName')}</th>
                <th>{t('en', 'emailLabel')}</th>
                <th>{t('en', 'roleLabel')}</th>
                <th>Trusted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.displayName || '—'}</td>
                  <td>{u.email}</td>
                  <td><Pill tone={u.role === 'admin' ? 'success' : 'info'}>{u.role}</Pill></td>
                  <td>
                    {u.role === 'customer' && (
                      <button
                        className="btn"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.75rem',
                          borderRadius: 40,
                          background: u.trusted ? 'var(--success)' : 'var(--surface-glass)',
                          color: u.trusted ? '#fff' : 'var(--text)',
                          border: '1px solid var(--border)',
                        }}
                        onClick={() => setTrustedOf(u.uid, !u.trusted)}
                      >
                        {u.trusted ? '✓ Trusted' : 'Mark trusted'}
                      </button>
                    )}
                    {u.role !== 'customer' && <span className="muted" style={{ fontSize: '0.75rem' }}>—</span>}
                  </td>
                  <td>
                    <select
                      className="input"
                      style={{ padding: '6px 10px', fontSize: '0.8rem', width: 140 }}
                      value={u.role}
                      onChange={(e) => setRoleOf(u.uid, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
