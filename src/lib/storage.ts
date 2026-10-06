import { useState, useEffect, useCallback } from 'react';

// All instances sharing a key stay in sync (same tab via custom event, other tabs via "storage").
const SYNC_EVENT = 'local-storage-sync';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const read = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  };
  const [storedValue, setStoredValue] = useState<T>(read);

  useEffect(() => {
    const onSync = (e: Event) => {
      if ((e as CustomEvent).detail?.key === key) setStoredValue(read());
    };
    const onStorage = (e: StorageEvent) => { if (e.key === key) setStoredValue(read()); };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const raw = window.localStorage.getItem(key);
      const current: T = raw ? JSON.parse(raw) : initialValue;
      const v = value instanceof Function ? value(current) : value;
      setStoredValue(v);
      window.localStorage.setItem(key, JSON.stringify(v));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [storedValue, setValue] as const;
}
