import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

const DEFAULT_SETTINGS = {
  shopName: 'Quality Glass Industries',
  phone: '(787) 764-9404',
  address: '',
  kioskIdleMinutes: 2,
};

// Settings editor — admin-only Firestore doc settings/{key}.
export default function SettingsView() {
  const toast = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'settings'), (snap) => {
      const s = {};
      snap.forEach((d) => (s[d.id] = d.data()));
      setSettings(s);
      setLoading(false);
    });
    return unsub;
  }, []);

  const patch = (key, val) => {
    setSettings((s) => ({ ...s, [key]: { ...s[key], ...val } }));
  };

  const save = async (key, val) => {
    try {
      await setDoc(doc(db, 'settings', key), { ...DEFAULT_SETTINGS, ...val }, { merge: true });
      toast.success(`Settings ${key} saved`);
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    }
  };

  const shop = { ...DEFAULT_SETTINGS, ...(settings.shop || {}) };

  return (
    <div>
      <h2 className="page-title">{t('en', 'adminSettings')}</h2>
      <p className="page-sub">Shop info, phone, kiosk behavior.</p>

      {loading ? (
        <p className="muted">{t('en', 'loading')}</p>
      ) : (
        <div className="glass-card" style={{ padding: 24, maxWidth: 480 }}>
          <div className="field">
            <label>Shop Name</label>
            <input className="input" value={shop.shopName} onChange={(e) => patch('shop', { shopName: e.target.value })} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input className="input" value={shop.phone} onChange={(e) => patch('shop', { phone: e.target.value })} />
          </div>
          <div className="field">
            <label>Address</label>
            <input className="input" value={shop.address} onChange={(e) => patch('shop', { address: e.target.value })} />
          </div>
          <div className="field">
            <label>Kiosk idle reset (minutes)</label>
            <input
              className="input"
              type="number"
              min={1}
              max={30}
              value={shop.kioskIdleMinutes}
              onChange={(e) => patch('shop', { kioskIdleMinutes: +e.target.value })}
            />
          </div>
          <Button onClick={() => save('shop', shop)}>Save</Button>
        </div>
      )}
    </div>
  );
}
