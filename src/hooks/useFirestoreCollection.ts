import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type QueryConstraint } from 'firebase/firestore';
import { db } from '../services/firebase/config';

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Sincroniza em tempo real uma subcoleção de users/{userId}/{subcollection}.
 * Usado tanto para os cards "hoje" (com filtro de data) quanto para o
 * histórico (com filtro de intervalo) — evita duplicar lógica de listener
 * e mantém a UI sempre coerente com o Firestore, inclusive offline.
 */
export function useFirestoreCollection<T extends { id: string }>(
  userId: string | undefined,
  subcollection: string,
  constraints: QueryConstraint[],
  /** Chave primitiva estável representando os parâmetros dos `constraints` (ex.: `since?.getTime()`), já que os objetos QueryConstraint do Firestore não são comparáveis por valor. */
  depsKey: string | number,
  orderField = 'recordedAt',
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'users', userId, subcollection),
      ...constraints,
      orderBy(orderField, 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[]);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Erro ao sincronizar ${subcollection}:`, err);
        setError('Não foi possível carregar seus dados agora.');
        setLoading(false);
      },
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subcollection, orderField, depsKey]);

  return { data, loading, error };
}
