import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api';

export function useData(url: string, interval = 0) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState('');
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await api(url);
      if (request !== generation.current) return;
      setData(result);
      setError('');
    } catch (e: any) {
      if (request !== generation.current) return;
      setError(e.message);
    }
  }, [url]);
  useEffect(() => {
    setData(null);
    setError('');
    void reload();
    const timer = interval ? setInterval(reload, interval) : undefined;
    return () => {
      ++generation.current;
      clearInterval(timer);
    };
  }, [reload, interval]);
  return { data, error, reload };
}
