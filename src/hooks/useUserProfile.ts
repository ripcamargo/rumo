import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import type { UserProfile } from '../types';

interface UseUserProfileResult {
  profile: UserProfile | null;
  loading: boolean;
}

export function useUserProfile(userId: string | undefined): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao sincronizar perfil:', err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [userId]);

  return { profile, loading };
}
