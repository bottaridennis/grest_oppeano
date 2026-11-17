import { useCallback, useEffect, useState } from 'react';

/**
 * Routing minimale basato su hash (#/percorso): funziona su hosting statico
 * come GitHub Pages, supporta il tasto "indietro" e i link diretti.
 */
function readHash(): string[] {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return raw.split('/').filter(Boolean).map(decodeURIComponent);
}

export function useHashRoute() {
  const [segments, setSegments] = useState<string[]>(readHash);

  useEffect(() => {
    const onChange = () => {
      setSegments(readHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    const target = '#/' + path.replace(/^\/+/, '');
    if (window.location.hash === target) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.location.hash = target;
  }, []);

  return { segments, navigate };
}

export type Navigate = (path: string) => void;
