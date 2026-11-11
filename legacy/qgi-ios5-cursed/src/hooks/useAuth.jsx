import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // firebase auth user
  const [profile, setProfile] = useState(null); // users/{uid} doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const unsubProfile = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
          setLoading(false);
        });
        return () => unsubProfile();
      }
      setProfile(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const role = profile ? profile.role : null;
  const isStaff = role === 'admin' || role === 'staff';
  const isAdmin = role === 'admin';

  return (
    <AuthCtx.Provider value={{ user, profile, role, isStaff, isAdmin, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
