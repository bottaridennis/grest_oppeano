import { useEffect, useState } from 'react';
import { onSnapshot, type Query, type DocumentData } from 'firebase/firestore';

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Sottoscrizione realtime a una query Firestore.
 * `key` identifica la query: quando cambia la sottoscrizione viene ricreata.
 * Se `buildQuery` restituisce null la sottoscrizione è disabilitata e i dati vengono svuotati.
 */
export function useCollection<T extends { id: string }>(
  key: string,
  buildQuery: () => Query<DocumentData> | null,
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    const q = buildQuery();
    if (!q) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
        setState({ data, loading: false, error: null });
      },
      (error) => {
        console.error(`[firestore] ${key}:`, error);
        setState({ data: [], loading: false, error });
      },
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
