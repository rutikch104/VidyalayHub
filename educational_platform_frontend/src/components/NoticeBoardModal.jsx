import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Pin, Calendar, Building2, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import feedService from '@/services/feedService';

function formatRange(startsAt, endsAt) {
  try {
    const s = startsAt ? new Date(startsAt) : null;
    const e = endsAt ? new Date(endsAt) : null;
    const opts = { dateStyle: 'medium', timeStyle: 'short' };
    if (s && !Number.isNaN(s.getTime())) {
      if (e && !Number.isNaN(e.getTime())) {
        return `${s.toLocaleString(undefined, opts)} → ${e.toLocaleString(undefined, opts)}`;
      }
      return `From ${s.toLocaleString(undefined, opts)}`;
    }
    return '';
  } catch {
    return '';
  }
}

export default function NoticeBoardModal({ open, onClose, sidebarPreview = [], initialNoticeId = null }) {
  const { user } = useAuth();
  const hasCollege = Boolean(user?.tenant_id);
  const previewRef = useRef(sidebarPreview);
  previewRef.current = sidebarPreview;
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    if (hasCollege) {
      setLoading(true);
      try {
        const list = await feedService.getTenantNoticesFull(80);
        setNotices(Array.isArray(list) ? list : []);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Could not load notices.');
        const prev = previewRef.current;
        setNotices(Array.isArray(prev) ? prev : []);
      } finally {
        setLoading(false);
      }
    } else {
      const prev = previewRef.current;
      setNotices(Array.isArray(prev) ? prev : []);
    }
  }, [hasCollege]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const hasInitial = initialNoticeId && notices.some((n) => n.id === initialNoticeId);
    const next = hasInitial ? initialNoticeId : notices[0]?.id || null;
    setSelectedId(next);
  }, [open, initialNoticeId, notices]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const selected = notices.find((n) => n.id === selectedId) || notices[0] || null;
  const fullBody = selected?.body_full || selected?.body || '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-board-title"
        className="flex max-h-[min(92vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-modal ring-1 ring-black/[0.06] md:flex-row"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex max-h-[40vh] shrink-0 flex-col border-b border-border/60 bg-muted/25 md:max-h-none md:w-[min(40%,320px)] md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
            <div className="min-w-0">
              <h2 id="notice-board-title" className="font-display truncate text-lg font-bold text-foreground">
                Notice board
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {hasCollege ? 'Official updates for your college' : 'Announcements'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Loading…
              </div>
            ) : error ? (
              <p className="px-2 py-4 text-center text-sm text-amber-800">{error}</p>
            ) : notices.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                {hasCollege
                  ? 'No active notices right now. College staff can publish notices from Admin → Notice board.'
                  : 'No notices. Link your account to a college to see official notices.'}
              </p>
            ) : (
              <ul className="space-y-1">
                {notices.map((n) => {
                  const active = n.id === selectedId;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(n.id)}
                        className={`flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                          active ? 'bg-card text-foreground shadow-soft ring-1 ring-border/60' : 'hover:bg-muted/60'
                        }`}
                      >
                        <span className="flex items-start gap-1.5 font-semibold leading-snug">
                          {n.is_pinned ? <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
                          <span className="line-clamp-2">{n.title}</span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {n.source === 'college' ? (n.college_name || 'College') : (n.community_name || 'Community')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {selected ? (
            <>
              <div className="border-b border-border/50 px-5 py-4 sm:px-6">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {selected.source === 'college' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      <Building2 className="h-3 w-3" />
                      {selected.college_name || 'College'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-800">
                      {selected.community_name || 'Community'}
                    </span>
                  )}
                  {selected.is_pinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                      <Pin className="h-3 w-3" /> Pinned
                    </span>
                  ) : null}
                </div>
                <h3 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {selected.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>By {selected.author_name || '—'}</span>
                  {selected.starts_at || selected.ends_at ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatRange(selected.starts_at, selected.ends_at)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
                <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-[15px]">{fullBody || '—'}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <ChevronRight className="h-8 w-8 opacity-40" />
              <p className="text-sm">Select a notice to read the full message.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
