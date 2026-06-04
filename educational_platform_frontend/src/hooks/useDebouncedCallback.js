import { useMemo, useRef } from 'react';

/** Returns a debounced function (trailing edge). */
export function useDebouncedCallback(fn, delayMs) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeoutRef = useRef(null);

  return useMemo(() => {
    const debounced = (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        fnRef.current(...args);
      }, delayMs);
    };
    return debounced;
  }, [delayMs]);
}
