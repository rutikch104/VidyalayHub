import { useCallback, useEffect, useState } from 'react';

const PANEL_GAP = 10;
const PANEL_MAX_WIDTH = 320;
const PANEL_MIN_WIDTH = 240;

/**
 * Anchors the autocomplete panel to the textarea using fixed positioning
 * so it floats above page chrome and flips above when space is tight.
 */
export function useComposerDropdownAnchor({ open, anchorRef, panelRef, deps = [] }) {
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!open || !anchor) {
      setCoords(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight || 220;
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP;
    const spaceAbove = rect.top - PANEL_GAP;
    const placeAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;

    const width = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, rect.width));
    const left = Math.min(
      Math.max(PANEL_GAP, rect.left),
      window.innerWidth - width - PANEL_GAP,
    );

    const top = placeAbove
      ? rect.top - panelHeight - PANEL_GAP
      : rect.bottom + PANEL_GAP;

    setCoords({ top, left, width, placeAbove });
  }, [open, anchorRef, panelRef]);

  useEffect(() => {
    updatePosition();
    if (!open) return undefined;

    const onLayout = () => updatePosition();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, updatePosition, ...deps]);

  return { coords, updatePosition };
}
