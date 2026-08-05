import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEPS = [
  { id: 'lang' },
  { id: 'customer' },
  { id: 'thick' },
  { id: 'type' },
  { id: 'size' },
  { id: 'color' },
  { id: 'add' },
  { id: 'pay' },
  { id: 'review' },
  { id: 'success' },
];

export default function CustomerStep() {
  const { lang, setStep, order, set } = useKiosk();
  const { customerName, projectName, contact } = order;

  const setContact = (patch) => set({ contact: { ...contact, ...patch } });

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(0)}>←</button>
        </div>
        <Stepper steps={STEPS.slice(1)} current={1} />
        <h2 className="page-title mt-3">{t(lang, 'custTitle')}</h2>
        <p className="page-sub">{t(lang, 'custSub')}</p>

        <div className="glass-card" style={{ padding: 24 }}>
          <div className="field">
            <label>{t(lang, 'nameLabel')} *</label>
            <input
              className="input"
              value={customerName}
              onChange={(e) => set({ customerName: e.target.value })}
              placeholder={t(lang, 'namePh')}
              autoFocus
            />
          </div>
          <div className="field">
            <label>
              {t(lang, 'projLabel')} <span className="opt">{t(lang, 'optional')}</span>
            </label>
            <input
              className="input"
              value={projectName}
              onChange={(e) => set({ projectName: e.target.value })}
              placeholder={t(lang, 'projPh')}
            />
          </div>

          {/* contact tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['phone', 'email', 'both', 'none'].map((tab) => (
              <button
                key={tab}
                className="btn"
                style={{
                  padding: '8px 16px',
                  background: contact.tab === tab ? 'var(--glass-active)' : 'var(--surface-glass)',
                  color: contact.tab === tab ? '#fff' : 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 40,
                }}
                onClick={() => setContact({ tab })}
              >
                {t(lang, `ctab${tab[0].toUpperCase() + tab.slice(1)}`)}
              </button>
            ))}
          </div>

          {contact.tab !== 'none' && (
            <div className="grid-2">
              {(contact.tab === 'phone' || contact.tab === 'both') && (
                <div className="field">
                  <label>{t(lang, 'phoneLabel')}</label>
                  <input
                    className="input"
                    value={contact.phone}
                    onChange={(e) => setContact({ phone: e.target.value })}
                    placeholder={t(lang, 'phonePh')}
                  />
                </div>
              )}
              {(contact.tab === 'email' || contact.tab === 'both') && (
                <div className="field">
                  <label>{t(lang, 'emailLabel')}</label>
                  <input
                    className="input"
                    type="email"
                    value={contact.email}
                    onChange={(e) => setContact({ email: e.target.value })}
                    placeholder={t(lang, 'emailPh')}
                  />
                </div>
              )}
            </div>
          )}
          {contact.tab === 'none' && (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              {t(lang, 'ctabNoneDesc')}
            </p>
          )}
        </div>

        <div className="mt-3">
          <Button block disabled={!customerName.trim()} onClick={() => setStep(2)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
