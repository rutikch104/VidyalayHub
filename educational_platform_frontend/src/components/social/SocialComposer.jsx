// @ts-nocheck
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import socialComposerService from '@/services/socialComposerService';
import { SocialTextSpans } from '@/components/RichPostText';
import {
  getActiveComposerAutocomplete,
  getHashtagContext,
  getMentionContext,
  extractHashtagNamesFromText,
} from '@/utils/socialText';
import { mentionTokenFromUser } from '@/utils/mentionUtils';
import { useAuth } from '@/contexts/AuthContext';
import ComposerAutocompletePanel from '@/components/social/ComposerAutocompletePanel';
import { useComposerDropdownAnchor } from '@/components/social/useComposerDropdownAnchor';

/**
 * Unified @mention + #hashtag composer for posts, comments, and replies.
 * @param {'all'|'teachers'} mentionMode - user search scope
 * @param {'boxed'|'inline'} variant - layout style
 */
export default function SocialComposer({
  id = 'social-composer',
  placeholder = 'Write something… Use @ to mention people, # for topics',
  popularTags = [],
  mentionMode = 'all',
  variant = 'boxed',
  value: controlledValue,
  onValueChange,
  onSubmit,
  submitting = false,
  submitLabel = 'Post',
  onCancel,
  showHint = true,
  hideFooter = false,
  clearOnSubmit = true,
  onFocus,
  rows,
  textareaClassName = '',
  onMentionedUsersChange,
  className = '',
}) {
  const { user: currentUser } = useAuth();
  const textareaRef = useRef(null);
  const mirrorInnerRef = useRef(null);
  const panelRef = useRef(null);
  const [internalText, setInternalText] = useState('');
  const text = controlledValue !== undefined ? controlledValue : internalText;
  const setText = (next) => {
    if (onValueChange) onValueChange(next);
    else setInternalText(next);
  };
  const [cursor, setCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [hashtagHighlight, setHashtagHighlight] = useState(0);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [loadedPopularTags, setLoadedPopularTags] = useState([]);

  const mentionedUserIds = useMemo(
    () => mentionedUsers.map((u) => String(u.id)),
    [mentionedUsers],
  );

  useEffect(() => {
    onMentionedUsersChange?.(mentionedUsers);
  }, [mentionedUsers, onMentionedUsersChange]);

  useEffect(() => {
    let cancelled = false;
    socialComposerService.getPopularHashtags(24).then((tags) => {
      if (!cancelled && Array.isArray(tags)) setLoadedPopularTags(tags);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /** Keep cursor aligned with the textarea after controlled value updates. */
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? 0;
    setCursor((prev) => (prev !== pos ? pos : prev));
  }, [text]);

  const resolvedPopularTags =
    popularTags.length > 0 ? popularTags : loadedPopularTags;

  const activeAutocomplete = getActiveComposerAutocomplete(text, cursor);
  const mentionCtx = activeAutocomplete.kind === 'mention' ? activeAutocomplete.ctx : null;
  const hashtagCtx = activeAutocomplete.kind === 'hashtag' ? activeAutocomplete.ctx : null;

  const debouncedHashtagSearch = useDebouncedCallback(async (query) => {
    setHashtagLoading(true);
    try {
      const results = await socialComposerService.searchHashtags(query, 12);
      setHashtagSuggestions(results);
    } catch {
      setHashtagSuggestions([]);
    } finally {
      setHashtagLoading(false);
    }
  }, 220);

  useEffect(() => {
    if (!hashtagCtx) {
      setHashtagSuggestions([]);
      setHashtagLoading(false);
      return;
    }
    setHashtagHighlight(0);
    debouncedHashtagSearch(hashtagCtx.query);
  }, [hashtagCtx?.start, hashtagCtx?.query, debouncedHashtagSearch]);

  const hashtagFiltered = useMemo(() => {
    if (!hashtagCtx) return [];
    const q = hashtagCtx.query.toLowerCase();

    const fromApi = hashtagSuggestions.map((x) =>
      typeof x === 'string' ? { tag: x, count: 0 } : x,
    );

    const popularSource =
      resolvedPopularTags.length > 0
        ? resolvedPopularTags
        : socialComposerService.fallbackHashtags();

    const fromPopular = popularSource.map((tag) => ({
      tag: typeof tag === 'string' ? tag : tag.tag || '',
      count: typeof tag === 'object' && tag?.count ? tag.count : 0,
    }));

    const merged = new Map();
    [...fromApi, ...fromPopular].forEach((item) => {
      const name = String(item.tag || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (merged.has(key)) return;
      if (!q || name.toLowerCase().startsWith(q)) {
        merged.set(key, { tag: name, count: item.count || 0 });
      }
    });

    return [...merged.values()]
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 12);
  }, [hashtagCtx, hashtagSuggestions, resolvedPopularTags]);

  const runMentionSearch = useCallback(async (q) => {
    const needle = q.trim();
    if (!needle) {
      setMentionSuggestions([]);
      return;
    }
    setMentionLoading(true);
    try {
      const users =
        mentionMode === 'teachers'
          ? await socialComposerService.searchTeacherMentionUsers(needle)
          : await socialComposerService.searchMentionUsers(needle);
      const selected = new Set(mentionedUserIds);
      setMentionSuggestions((users || []).filter((t) => !selected.has(String(t.id))));
    } catch {
      setMentionSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  }, [mentionedUserIds, mentionMode]);

  const debouncedMentionSearch = useDebouncedCallback(runMentionSearch, 260);

  useEffect(() => {
    if (activeAutocomplete.kind !== 'mention' || !mentionCtx) {
      setMentionSuggestions([]);
      setMentionHighlight(0);
      return;
    }
    setMentionHighlight(0);
    if (mentionCtx.query.length < 1) {
      setMentionSuggestions([]);
      return;
    }
    debouncedMentionSearch(mentionCtx.query);
  }, [text, cursor, activeAutocomplete.kind, mentionCtx?.query, debouncedMentionSearch]);

  useEffect(() => {
    if (mentionSuggestions.length === 0) {
      setMentionHighlight(0);
      return;
    }
    setMentionHighlight((i) => Math.min(i, mentionSuggestions.length - 1));
  }, [mentionSuggestions.length]);

  useEffect(() => {
    if (hashtagFiltered.length === 0) {
      setHashtagHighlight(0);
      return;
    }
    setHashtagHighlight((i) => Math.min(i, hashtagFiltered.length - 1));
  }, [hashtagFiltered.length]);

  const applyMention = useCallback(
    (u) => {
      const ctx = getMentionContext(text, cursor);
      if (!ctx) return;
      const token = mentionTokenFromUser(u);
      const insert = `@${token} `;
      const newText = text.slice(0, ctx.start) + insert + text.slice(cursor);
      setText(newText);
      setMentionedUsers((prev) => {
        if (prev.some((x) => String(x.id) === String(u.id))) return prev;
        return [...prev, u];
      });
      setMentionSuggestions([]);
      const pos = ctx.start + insert.length;
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(pos, pos);
          setCursor(pos);
        }
      });
    },
    [text, cursor],
  );

  const handleTextChange = useCallback(
    (e) => {
      const ta = e.target;
      const next = ta.value;
      const selStart = ta.selectionStart ?? next.length;
      const selEnd = ta.selectionEnd ?? selStart;
      if (onValueChange) onValueChange(next);
      else setInternalText(next);
      setCursor(selStart);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.setSelectionRange(selStart, selEnd);
        setCursor(el.selectionStart ?? selStart);
      });
    },
    [onValueChange],
  );

  const applyHashtag = useCallback(
    (tagName) => {
      const ctx = getHashtagContext(text, cursor);
      if (!ctx) return;
      const safe = String(tagName).replace(/^#/, '');
      if (!safe) return;
      const insert = `#${safe} `;
      const newText = text.slice(0, ctx.start) + insert + text.slice(cursor);
      setText(newText);
      const pos = ctx.start + insert.length;
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(pos, pos);
          setCursor(pos);
        }
      });
    },
    [text, cursor],
  );

  const handleKeyDown = (e) => {
    const val = e.currentTarget.value;
    const pos = e.currentTarget.selectionStart ?? 0;
    const active = getActiveComposerAutocomplete(val, pos);

    if (active.kind === 'mention') {
      const m = getMentionContext(val, pos);
      if (
        m &&
        navigateList(
          e,
          mentionSuggestions.length,
          mentionHighlight,
          setMentionHighlight,
          (idx) => {
            const pick = mentionSuggestions[idx];
            if (pick) applyMention(pick);
          },
        )
      ) {
        return;
      }
      if (e.key === 'Escape' && m) {
        e.preventDefault();
        setMentionSuggestions([]);
        setMentionHighlight(0);
        return;
      }
    } else if (active.kind === 'hashtag') {
      const h = getHashtagContext(val, pos);
      if (
        h &&
        navigateList(
          e,
          hashtagFiltered.length,
          hashtagHighlight,
          setHashtagHighlight,
          (idx) => {
            const pick = hashtagFiltered[idx];
            if (pick) applyHashtag(pick.tag);
          },
        )
      ) {
        return;
      }
      if (e.key === 'Escape' && h) {
        e.preventDefault();
        setHashtagHighlight(0);
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const content = text.trim();
    if (!content || submitting) return;
    const tags = extractHashtagNamesFromText(content);
    await onSubmit?.({
      content,
      tags,
      mentioned_users: mentionedUserIds,
    });
    if (clearOnSubmit) {
      setText('');
      setMentionedUsers([]);
      setCursor(0);
    }
  };

  const showMentionPanel = activeAutocomplete.kind === 'mention' && Boolean(mentionCtx);
  const showHashtagPanel = activeAutocomplete.kind === 'hashtag' && Boolean(hashtagCtx);
  const panelOpen = showMentionPanel || showHashtagPanel;
  const panelKind = showMentionPanel ? 'mention' : 'hashtag';

  const { coords, updatePosition } = useComposerDropdownAnchor({
    open: panelOpen,
    anchorRef: textareaRef,
    panelRef,
    deps: [
      panelKind,
      mentionLoading,
      mentionSuggestions.length,
      hashtagLoading,
      hashtagFiltered.length,
      mentionHighlight,
      hashtagHighlight,
      text,
      cursor,
    ],
  });

  useEffect(() => {
    if (panelOpen) {
      const id = requestAnimationFrame(() => updatePosition());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [panelOpen, updatePosition, mentionLoading, hashtagLoading, mentionSuggestions.length, hashtagFiltered.length]);

  const isInline = variant === 'inline';

  const navigateList = (e, listLength, highlight, setHighlight, onSelect) => {
    if (listLength <= 0) return false;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => Math.min(i + 1, listLength - 1));
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
      return true;
    }
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
      e.preventDefault();
      onSelect(highlight);
      return true;
    }
    return false;
  };

  return (
    <div className={cn('tc-social-composer', isInline && 'tc-social-composer--inline', className)}>
      <div className="tc-social-composer__field">
        <div className="tc-social-composer__input-wrap">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl" aria-hidden>
            <div className="px-3 py-2.5">
              <div
                ref={mirrorInnerRef}
                className="text-left text-sm leading-relaxed"
                style={{ transform: `translateY(-${scrollTop}px)` }}
              >
                <div className="whitespace-pre-wrap break-words">
                  <SocialTextSpans text={text} />
                </div>
              </div>
            </div>
          </div>
          <textarea
            id={id}
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onSelect={(e) => setCursor(e.target.selectionStart ?? 0)}
            onClick={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
            onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            rows={rows ?? (isInline ? 1 : 2)}
            placeholder={placeholder}
            className={cn(
              isInline ? 'tc-social-composer__textarea tc-social-composer__textarea--inline' : 'tc-social-composer__textarea',
              textareaClassName,
            )}
            aria-label="Compose text"
            aria-expanded={panelOpen}
            aria-controls={panelOpen ? (showMentionPanel ? 'composer-mention-listbox' : 'composer-hashtag-listbox') : undefined}
            aria-autocomplete="list"
          />
        </div>
      </div>

      <ComposerAutocompletePanel
        open={panelOpen}
        coords={coords}
        panelRef={panelRef}
        kind={panelKind}
        mentionLoading={mentionLoading}
        mentionSuggestions={mentionSuggestions}
        mentionHighlight={mentionHighlight}
        onMentionHighlight={setMentionHighlight}
        onMentionSelect={applyMention}
        mentionQuery={mentionCtx?.query ?? ''}
        hashtagLoading={hashtagLoading}
        hashtagItems={hashtagFiltered}
        hashtagHighlight={hashtagHighlight}
        onHashtagHighlight={setHashtagHighlight}
        onHashtagSelect={applyHashtag}
        hashtagQuery={hashtagCtx?.query ?? ''}
        currentUser={currentUser}
      />

      {showHint && !isInline ? (
        <p className="tc-social-composer__hint">@ mention people · # add topics · Ctrl+Enter to post</p>
      ) : null}

      {!hideFooter ? (
        <div className={isInline ? 'tc-social-composer__inline-actions' : 'tc-social-composer__footer'}>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="tc-social-composer__cancel-btn" aria-label="Cancel">
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            disabled={!text.trim() || submitting}
            onClick={handleSubmit}
            className={isInline ? 'tc-answer-thread__send' : 'tc-detail-modal__answer-submit'}
            aria-label={submitLabel}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {!isInline ? submitLabel : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
