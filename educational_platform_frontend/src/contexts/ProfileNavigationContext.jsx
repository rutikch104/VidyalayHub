import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ProfileNavigationContext = createContext(undefined);

function readProfileIdFromUrl() {
  try {
    const id = new URLSearchParams(window.location.search).get('profile');
    return id && String(id).trim() ? String(id).trim() : null;
  } catch {
    return null;
  }
}

export function ProfileNavigationProvider({ children, onNavigate }) {
  const { user } = useAuth();
  const [viewUserId, setViewUserId] = useState(() => readProfileIdFromUrl());

  useEffect(() => {
    const profileId = readProfileIdFromUrl();
    if (!profileId || !user) return;
    if (user?.id && String(user.id) === profileId) {
      setViewUserId(null);
      onNavigate?.('profile');
    } else {
      setViewUserId(profileId);
      onNavigate?.('user-profile');
    }
  }, [user?.id, onNavigate]);

  const openProfile = useCallback(
    (userId) => {
      if (userId == null || userId === '') return;
      const id = String(userId);
      if (user?.id && String(user.id) === id) {
        setViewUserId(null);
        onNavigate?.('profile');
        return;
      }
      setViewUserId(id);
      onNavigate?.('user-profile');
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('profile', id);
        window.history.replaceState({}, '', url.pathname + url.search);
      } catch {
        /* ignore */
      }
    },
    [user?.id, onNavigate],
  );

  const closeProfile = useCallback(() => {
    setViewUserId(null);
    onNavigate?.('home');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('profile');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    } catch {
      /* ignore */
    }
  }, [onNavigate]);

  const value = useMemo(
    () => ({
      viewUserId,
      openProfile,
      closeProfile,
      setViewUserId,
    }),
    [viewUserId, openProfile, closeProfile],
  );

  return (
    <ProfileNavigationContext.Provider value={value}>
      {children}
    </ProfileNavigationContext.Provider>
  );
}

export function useProfileNavigation() {
  const ctx = useContext(ProfileNavigationContext);
  if (!ctx) {
    throw new Error('useProfileNavigation must be used within ProfileNavigationProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op). */
export function useProfileNavigationOptional() {
  return useContext(ProfileNavigationContext);
}
