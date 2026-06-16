import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search, Bell, MessageSquare, Menu, X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import notificationService from '@/services/notificationService';
import messageService from '@/services/messageService';
import { runGlobalSearch } from '@/services/searchService';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import HeaderProfileMenu from '@/components/header/HeaderProfileMenu';
import GlobalSearchPanel from '@/components/search/GlobalSearchPanel';
import InstitutionBranding from '@/components/branding/InstitutionBranding';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from '@/lib/searchHistory';

/* OS-aware keyboard shortcut hint */
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
const SHORTCUT_HINT = isMac ? '⌘K' : 'Ctrl K';

/** Score a string field against the query — lower = more relevant */
function fieldScore(field, q) {
  if (!field) return 99;
  const f = field.toLowerCase();
  if (f === q) return 0;
  if (f.startsWith(q)) return 1;
  if (f.includes(q)) return 2;
  return 99;
}

function userRelevance(u, q) {
  const fn = (u.first_name || '').toLowerCase();
  const ln = (u.last_name  || '').toLowerCase();
  return Math.min(fieldScore(fn, q), fieldScore(ln, q), fieldScore(`${fn} ${ln}`, q));
}

function sortByRelevance(arr, scoreFn) {
  if (!arr?.length) return arr;
  return [...arr].sort((a, b) => scoreFn(a) - scoreFn(b));
}

/* ── Header ── */
const Header = ({ onNavigate, currentPage = 'home', onMobileMenuToggle, isMobileMenuOpen = false }) => {
  const { user } = useAuth();
  const profileNav = useProfileNavigationOptional();
  const desktopInputRef = useRef(null);
  const mobileInputRef  = useRef(null);
  const globalSearchReq = useRef(0);
  const itemRefs        = useRef([]);

  const [isSearchFocused,      setIsSearchFocused]      = useState(false);
  const [unreadNotifCount,     setUnreadNotifCount]      = useState(0);
  const [unreadMsgCount,       setUnreadMsgCount]        = useState(0);
  const [globalQuery,          setGlobalQuery]           = useState('');
  const [debouncedGlobalQuery, setDebouncedGlobalQuery]  = useState('');
  const [globalSearchLoading,  setGlobalSearchLoading]   = useState(false);
  const [globalResults,        setGlobalResults]         = useState(null);
  const [searchPanelOpen,      setSearchPanelOpen]       = useState(false);
  const [mobileSearchOpen,     setMobileSearchOpen]      = useState(false);
  const [focusedIdx,           setFocusedIdx]            = useState(-1);
  const [scrolled,             setScrolled]              = useState(false);
  const [recentSearches,       setRecentSearches]        = useState([]);

  /* Load cached recent searches */
  useEffect(() => {
    setRecentSearches(getRecentSearches(user?.id));
  }, [user?.id]);

  /* Scroll-aware shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedGlobalQuery(globalQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [globalQuery]);

  /* Search */
  useEffect(() => {
    if (!user || debouncedGlobalQuery.length < 2) {
      setGlobalResults(null);
      setGlobalSearchLoading(false);
      return;
    }
    const id = ++globalSearchReq.current;
    setGlobalSearchLoading(true);
    runGlobalSearch(debouncedGlobalQuery)
      .then((r) => {
        if (globalSearchReq.current === id) {
          const q = debouncedGlobalQuery.trim().toLowerCase();
          setGlobalResults({
            ...r,
            users: sortByRelevance(r.users, (u) => userRelevance(u, q)),
          });
          setGlobalSearchLoading(false);
          setFocusedIdx(-1);
          itemRefs.current = [];
        }
      })
      .catch(() => {
        if (globalSearchReq.current === id) setGlobalSearchLoading(false);
      });
  }, [debouncedGlobalQuery, user]);

  const totalGlobalHits = useMemo(() => (
    (globalResults?.users?.length      || 0) +
    (globalResults?.posts?.length      || 0) +
    (globalResults?.communities?.length || 0) +
    (globalResults?.jobs?.length       || 0) +
    (globalResults?.events?.length     || 0)
  ), [globalResults]);

  const flatCount = useMemo(() => totalGlobalHits, [totalGlobalHits]);

  /* Autofocus mobile search input when overlay opens */
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(() => mobileInputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);

  /* Close desktop search panel on outside click */
  useEffect(() => {
    if (!searchPanelOpen) return;
    const onDown = (e) => {
      if (!e.target.closest('[data-search-shell]')) {
        setSearchPanelOpen(false);
        setFocusedIdx(-1);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchPanelOpen]);

  /* Unread counts */
  useEffect(() => {
    if (!user) { setUnreadNotifCount(0); setUnreadMsgCount(0); return; }
    let cancelled = false;
    const loadNotifications = async () => {
      try { const { unread_count } = await notificationService.getUnreadCount(); if (!cancelled) setUnreadNotifCount(Number(unread_count) || 0); }
      catch { if (!cancelled) setUnreadNotifCount(0); }
    };
    const loadMessages = async () => {
      try { const { total_unread } = await messageService.getUnreadCount(); if (!cancelled) setUnreadMsgCount(Number(total_unread) || 0); }
      catch { if (!cancelled) setUnreadMsgCount(0); }
    };
    const loadAll = () => { void loadNotifications(); void loadMessages(); };
    loadAll();
    const interval = setInterval(loadAll, 45000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('app:notifications-changed', () => void loadNotifications());
    window.addEventListener('app:messages-changed',      () => void loadMessages());
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  const closeSearch = useCallback(() => {
    setSearchPanelOpen(false);
    setGlobalQuery('');
    setDebouncedGlobalQuery('');
    setGlobalResults(null);
    setFocusedIdx(-1);
  }, []);

  const closeMobileSearch = useCallback(() => {
    setMobileSearchOpen(false);
    closeSearch();
  }, [closeSearch]);

  /* Global keyboard shortcuts */
  useEffect(() => {
    const openSearch = () => {
      if (window.innerWidth >= 768) desktopInputRef.current?.focus();
      else setMobileSearchOpen(true);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (mobileSearchOpen) setMobileSearchOpen(false);
        closeSearch();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('vh:open-global-search', openSearch);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('vh:open-global-search', openSearch);
    };
  }, [mobileSearchOpen, closeSearch]);

  const clearQuery = useCallback(() => {
    setGlobalQuery('');
    setDebouncedGlobalQuery('');
    setGlobalResults(null);
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, []);

  const persistRecentSearch = useCallback((term) => {
    const q = String(term || '').trim();
    if (q.length < 2) return;
    setRecentSearches(addRecentSearch(user?.id, q));
  }, [user?.id]);

  const handleTextSearch = useCallback((term) => {
    const q = String(term || '').trim();
    if (!q) return;
    setGlobalQuery(q);
    setDebouncedGlobalQuery(q);
    setSearchPanelOpen(true);
    persistRecentSearch(q);
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, [persistRecentSearch]);

  const handleRemoveRecent = useCallback((term) => {
    setRecentSearches(removeRecentSearch(user?.id, term));
  }, [user?.id]);

  const handleClearRecent = useCallback(() => {
    setRecentSearches(clearRecentSearches(user?.id));
  }, [user?.id]);

  const textSnippet = (s, n = 96) => {
    const t = (s || '').replace(/\s+/g, ' ').trim();
    return t.length <= n ? t : `${t.slice(0, n)}…`;
  };

  const handleSearchKeyDown = useCallback((e) => {
    if (!searchPanelOpen && !mobileSearchOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((prev) => {
        const next = Math.min(prev + 1, flatCount - 1);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((prev) => {
        if (prev <= 0) return -1;
        const next = prev - 1;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      itemRefs.current[focusedIdx]?.click?.();
    }
  }, [searchPanelOpen, mobileSearchOpen, flatCount, focusedIdx]);

  const handleItemAction = useCallback((action) => {
    const { type, data } = action;
    const activeQuery = debouncedGlobalQuery.trim() || globalQuery.trim();
    if (activeQuery.length >= 2) persistRecentSearch(activeQuery);
    closeSearch();
    setMobileSearchOpen(false);
    switch (type) {
      case 'user':    profileNav?.openProfile?.(data.id); break;
      case 'message': sessionStorage.setItem('prefill_message_user_id', String(data.id)); onNavigate('messages'); break;
      case 'post':    sessionStorage.setItem('scroll_to_post_id', data.id); onNavigate('home'); break;
      case 'community': sessionStorage.setItem('communities_search_prefill', data.name); onNavigate('communities'); break;
      case 'job':     sessionStorage.setItem('jobs_search_prefill', data.title || data.job_title || ''); onNavigate('jobs'); break;
      case 'event':   sessionStorage.setItem('events_search_prefill', data.title || ''); onNavigate('events'); break;
      default: break;
    }
  }, [closeSearch, debouncedGlobalQuery, globalQuery, onNavigate, persistRecentSearch, profileNav]);

  const showPanel = searchPanelOpen;

  const trimmedQuery = globalQuery.trim();
  const isIdlePanel = trimmedQuery.length < 2;

  /* Shared results panel (desktop + mobile overlay) */
  const panelContent = (
    <GlobalSearchPanel
      query={trimmedQuery}
      debouncedQuery={debouncedGlobalQuery}
      loading={globalSearchLoading}
      results={globalResults}
      totalHits={totalGlobalHits}
      recentSearches={recentSearches}
      focusedIdx={focusedIdx}
      onItemMouseDown={handleItemAction}
      onTextSearch={handleTextSearch}
      onRemoveRecent={handleRemoveRecent}
      onClearRecent={handleClearRecent}
      itemRefs={itemRefs}
      textSnippet={textSnippet}
    />
  );

  const panelStatusLabel = globalSearchLoading
    ? null
    : isIdlePanel
      ? (recentSearches.length > 0 ? 'Recent searches' : 'Global search')
      : totalGlobalHits > 0
        ? `${totalGlobalHits} result${totalGlobalHits === 1 ? '' : 's'}`
        : 'No matches';

  /* ── Minimal super-admin header ── */
  if (currentPage === 'super-admin') {
    return (
      <header className="app-header">
        <div className="app-header__inner mx-auto max-w-[1440px]">
          <div className="app-header__start">
            <InstitutionBranding onNavigate={onNavigate} variant="header" className="min-w-0" />
            <span className="app-header__super-badge">Super Admin</span>
          </div>
        </div>
      </header>
    );
  }

  /* ── Main header ── */
  return (
    <>
      <header className={`app-header ${scrolled ? 'app-header--scrolled' : ''}`}>
        <div className="app-header__inner mx-auto max-w-[1440px]">
          <div className="app-header__start">
            <button
              type="button"
              onClick={onMobileMenuToggle}
              className="app-header__icon-btn md:hidden"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
            <InstitutionBranding
              onNavigate={onNavigate}
              variant="header"
              className="min-w-0 max-w-[min(48vw,14rem)] sm:max-w-[min(42vw,18rem)] md:max-w-none"
            />
          </div>

          <div className="app-header__center" data-search-shell>
            <label htmlFor="header-search" className="sr-only">Search campus</label>
            <div className={`app-header__search ${isSearchFocused || showPanel ? 'focus-within' : ''}`}>
              <Search
                className={`app-header__search-icon ${isSearchFocused || showPanel ? 'app-header__search-icon--active' : ''}`}
                aria-hidden
              />
              <input
                ref={desktopInputRef}
                id="header-search"
                type="text"
                role="combobox"
                placeholder="Search people, posts, jobs, events…"
                autoComplete="off"
                spellCheck={false}
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); setSearchPanelOpen(true); }}
                onFocus={() => { setIsSearchFocused(true); setSearchPanelOpen(true); }}
                onBlur={() => setIsSearchFocused(false)}
                onKeyDown={handleSearchKeyDown}
                className={`app-header__search-input ${globalQuery ? 'app-header__search-input--has-value' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={showPanel}
                aria-autocomplete="list"
              />
              <div className="app-header__search-accessories">
                {globalSearchLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--vh-primary)]" aria-hidden />
                ) : null}
                {globalQuery ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={clearQuery}
                    className="app-header__search-clear"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                ) : (
                  <kbd className="app-header__search-kbd">{SHORTCUT_HINT}</kbd>
                )}
              </div>
              {showPanel ? (
                <div
                  role="listbox"
                  aria-label="Search results"
                  aria-live="polite"
                  data-search-shell
                  className="app-header__search-panel animate-in fade-in-0 slide-in-from-top-1 duration-150"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="app-header__search-panel-head">
                    <span className="app-header__search-panel-status">
                      {globalSearchLoading
                        ? (
                          <span className="app-header__search-panel-status--loading">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            Searching…
                          </span>
                        )
                        : panelStatusLabel}
                    </span>
                    <span className="app-header__search-panel-hint" aria-hidden>
                      Esc
                    </span>
                  </div>
                  <div className="app-header__search-panel-body">{panelContent}</div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="app-header__end">
            <div className="app-header__spacer" aria-hidden />

            <button
              type="button"
              className="app-header__icon-btn lg:hidden"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
            >
              <Search />
            </button>

            <div className="app-header__actions" aria-label="Activity">
              <button
                type="button"
                onClick={() => onNavigate('messages')}
                className={`app-header__icon-btn ${currentPage === 'messages' ? 'app-header__icon-btn--active' : ''}`}
                aria-label={unreadMsgCount > 0 ? `Messages, ${unreadMsgCount} unread` : 'Messages'}
              >
                <MessageSquare />
                {unreadMsgCount > 0 ? (
                  <span className="app-header__badge">
                    {unreadMsgCount > 99 ? '99+' : unreadMsgCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className={`app-header__icon-btn ${currentPage === 'notifications' ? 'app-header__icon-btn--active' : ''}`}
                aria-label={unreadNotifCount > 0 ? `Notifications, ${unreadNotifCount} unread` : 'Notifications'}
              >
                <Bell />
                {unreadNotifCount > 0 ? (
                  <span className="app-header__badge">
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                ) : null}
              </button>
            </div>

            <HeaderProfileMenu currentPage={currentPage} onNavigate={onNavigate} />
          </div>
        </div>
      </header>

      {mobileSearchOpen ? (
        <div className="app-header__mobile-search" role="dialog" aria-modal="true" aria-label="Search">
          <div className="app-header__mobile-search-backdrop" onClick={closeMobileSearch} aria-hidden />
          <div className="app-header__mobile-search-panel">
            <div className="app-header__mobile-search-input-row">
              {globalSearchLoading
                ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--vh-primary)]" aria-hidden />
                : <Search className="h-4 w-4 shrink-0 text-[var(--vh-primary)] opacity-70" aria-hidden />}
              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Search people, posts, jobs, events…"
                autoComplete="off"
                spellCheck={false}
                value={globalQuery}
                onChange={(e) => { setGlobalQuery(e.target.value); setSearchPanelOpen(true); }}
                onFocus={() => setSearchPanelOpen(true)}
                onKeyDown={handleSearchKeyDown}
              />
              {globalQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearQuery}
                  className="app-header__search-clear"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Close search"
                onClick={closeMobileSearch}
                className="app-header__mobile-search-done"
              >
                Done
              </button>
            </div>
            <div className="app-header__mobile-search-body" onMouseDown={(e) => e.preventDefault()}>
              {panelContent}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
