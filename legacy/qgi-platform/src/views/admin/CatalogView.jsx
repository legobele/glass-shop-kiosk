import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { t } from '../../i18n';
import { THICKNESS_ORDER } from '../../data/catalog';
import Button from '../../components/Button';
import { useToast } from '../../components/Toast';

// Catalog editor — reads Firestore catalog/{type}, admin can edit colors/thicknesses.
export default function CatalogView() {
  const toast = useToast();
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'catalog'), (snap) => {
      const c = {};
      snap.forEach((d) => (c[d.id] = d.data().colors || {}));
      setCatalog(c);
      setLoading(false);
    });
    return unsub;
  }, []);

  const save = async (type, colors) => {
    try {
      await setDoc(doc(db, 'catalog', type), { colors });
      toast.success(`Catalog ${type} saved`);
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    }
  };

  const addColor = (type) => {
    const name = prompt('Color key (e.g. clear, bronze):');
    if (!name) return;
    const colors = { ...catalog[type], [name.trim()]: [] };
    setCatalog((c) => ({ ...c, [type]: colors }));
    save(type, colors);
  };

  const removeColor = (type, color) => {
    if (!confirm(`Remove ${color}?`)) return;
    const colors = { ...catalog[type] };
    delete colors[color];
    setCatalog((c) => ({ ...c, [type]: colors }));
    save(type, colors);
  };

  const addThickness = (type, color) => {
    const th = prompt('Thickness (e.g. 1/4"):');
    if (!th) return;
    const colors = { ...catalog[type], [color]: [...(catalog[type][color] || []), th.trim()] };
    setCatalog((c) => ({ ...c, [type]: colors }));
    save(type, colors);
  };

  const removeThickness = (type, color, th) => {
    const colors = { ...catalog[type], [color]: catalog[type][color].filter((x) => x !== th) };
    setCatalog((c) => ({ ...c, [type]: colors }));
    save(type, colors);
  };

  return (
    <div>
      <h2 className="page-title">{t('en', 'catalogTitle')}</h2>
      <p className="page-sub">{t('en', 'catalogSub')}</p>

      {loading ? (
        <p className="muted">{t('en', 'loading')}</p>
      ) : (
        Object.entries(catalog).map(([type, colors]) => (
          <div key={type} className="glass-card mb-3" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{type}</strong>
              <Button variant="ghost" onClick={() => addColor(type)} style={{ padding: '7px 14px', fontSize: '0.8rem' }}>
                + {t('en', 'addColor')}
              </Button>
            </div>
            <div className="grid-2">
              {Object.entries(colors).map(([color, ths]) => (
                <div key={color} className="glass-card" style={{ padding: 14 }}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{color}</strong>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => removeColor(type, color)}>
                      {t('en', 'removeColor')}
                    </button>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {(ths || []).map((th) => (
                      <span key={th} className="pill pill-info">
                        {th}
                        <button
                          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 4, fontSize: '0.7rem' }}
                          onClick={() => removeThickness(type, color, th)}
                          aria-label="remove"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '0.7rem' }} onClick={() => addThickness(type, color)}>
                      + {t('en', 'addThickness')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* hint for thickness ordering */}
            <p className="muted mt-1" style={{ fontSize: '0.72rem' }}>
              Standard order: {THICKNESS_ORDER.join(', ')}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
