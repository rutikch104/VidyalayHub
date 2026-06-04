import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'vh-sidebar-collapsed';

const SidebarContext = createContext(null);

function readCollapsedPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children, mobileOpen: mobileOpenProp, onMobileOpenChange }) {
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [mobileOpenInternal, setMobileOpenInternal] = useState(false);

  const isMobileControlled = mobileOpenProp !== undefined;
  const mobileOpen = isMobileControlled ? mobileOpenProp : mobileOpenInternal;

  const setMobileOpen = useCallback(
    (open) => {
      if (onMobileOpenChange) onMobileOpenChange(open);
      if (!isMobileControlled) setMobileOpenInternal(open);
    },
    [onMobileOpenChange, isMobileControlled],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, [setMobileOpen]);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleCollapsed,
      mobileOpen,
      setMobileOpen,
      closeMobile,
    }),
    [collapsed, toggleCollapsed, mobileOpen, setMobileOpen, closeMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}

export function useSidebarOptional() {
  return useContext(SidebarContext);
}
