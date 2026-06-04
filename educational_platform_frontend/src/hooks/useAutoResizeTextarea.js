import { useLayoutEffect } from 'react';

/**
 * Auto-grow textarea up to maxHeightPx, then scroll internally.
 */
export function useAutoResizeTextarea(ref, value, { minHeightPx = 44, maxHeightPx = 144 } = {}) {
  useLayoutEffect(() => {
    const el = ref?.current;
    if (!el) return;
    el.style.height = `${minHeightPx}px`;
    const next = Math.min(Math.max(el.scrollHeight, minHeightPx), maxHeightPx);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeightPx ? 'auto' : 'hidden';
  }, [ref, value, minHeightPx, maxHeightPx]);
}
