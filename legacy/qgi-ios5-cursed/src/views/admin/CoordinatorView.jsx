import { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const JOB_STATUS = ['scheduled', 'in-progress', 'completed'];

// Install coordinator — jobs list, assign installer, schedule, status.
export default function CoordinatorView() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addJob = async (job) => {
    try {
      await addDoc(collection(db, 'jobs'), {
        ...job,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });
      toast.success('Job added');
      setShowAdd(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to add job');
    }
  };

  const setStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'jobs', id), { status });
      toast.success(`Job → ${status}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to update job');
    }
  };

  const removeJob = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      await deleteDoc(doc(db, 'jobs', id));
      toast.success('Job deleted');
    } catch (err) {
      toast.error(err?.message || 'Failed to delete job');
    }
  };

  return (
    <div>
      <h2 className="page-title">{t('en', 'coordTitle')}</h2>
      <p className="page-sub">{t('en', 'coordSub')}</p>

      <Button onClick={() => setShowAdd(true)} className="mb-3" style={{ marginBottom: 16 }}>
        + {t('en', 'addJob')}
      </Button>

      {loading ? (
        <p className="muted">{t('en', 'loading')}</p>
      ) : jobs.length === 0 ? (
        <p className="muted">{t('en', 'noJobs')}</p>
      ) : (
        <div className="grid-2">
          {jobs.map((j) => (
            <div key={j.id} className="glass-card" style={{ padding: 18 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: '0.95rem' }}>{j.title}</strong>
                <Pill tone={j.status === 'completed' ? 'success' : j.status === 'in-progress' ? 'info' : 'warn'}>{j.status}</Pill>
              </div>
              {j.address && <p className="muted" style={{ fontSize: '0.85rem' }}>📍 {j.address}</p>}
              {j.date && <p className="muted" style={{ fontSize: '0.85rem' }}>📅 {j.date}</p>}
              {j.installer && <p className="muted" style={{ fontSize: '0.85rem' }}>👷 {j.installer}</p>}
              <div className="row mt-2" style={{ gap: 6 }}>
                {JOB_STATUS.filter((s) => s !== j.status).map((s) => (
                  <button key={s} className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.72rem' }} onClick={() => setStatus(j.id, s)}>
                    → {s}
                  </button>
                ))}
                <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.72rem', marginLeft: 'auto' }} onClick={() => removeJob(j.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} onAdd={addJob} />}
    </div>
  );
}

function AddJobModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [installer, setInstaller] = useState('');

  return (
    <Modal open onClose={onClose} title={t('en', 'addJob')}>
      <div className="field">
        <label>{t('en', 'jobTitle')} *</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'jobAddress')}</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'jobDate')}</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'jobInstaller')}</label>
        <input className="input" value={installer} onChange={(e) => setInstaller(e.target.value)} />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>{t('en', 'cancel')}</Button>
        <Button onClick={() => title.trim() && onAdd({ title: title.trim(), address: address.trim(), date, installer: installer.trim() })}>
          {t('en', 'save')}
        </Button>
      </div>
    </Modal>
  );
}
