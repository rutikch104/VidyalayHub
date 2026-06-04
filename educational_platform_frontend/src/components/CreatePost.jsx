import { useState, useRef, useLayoutEffect, useCallback, useEffect, useMemo } from 'react';
import {
  Video,
  Image,
  FileText,
  Smile,
  MapPin,
  X,
  Hash,
  Loader2,
  AtSign,
  Globe,
  Building2,
  Lock,
  Paperclip,
  Code2,
  HelpCircle,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/services/postService';
import UserAvatar, { PresenceLabel } from '@/components/ui/UserAvatar';
import { PRESENCE_STATUS } from '@/lib/presence';
import postService from '@/services/postService';
import userService from '@/services/userService';
import { emitNotificationsChanged } from '@/services/notificationService';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import {
  getMentionContext,
  getHashtagContext,
  getActiveComposerAutocomplete,
  extractHashtagNamesFromText,
} from '@/utils/socialText';
import { SocialTextSpans } from '@/components/RichPostText';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

const FALLBACK_HASHTAGS = [
  'fitness', 'finance', 'film', 'RCPIT', 'Placements', 'Hackathon',
  'AI', 'React', 'FinalYear', 'Career', 'Learning', 'Study',
  'WebDevelopment', 'Programming',
];

const CODE_SEPARATOR = '\n\n---\n\n';

const LANGUAGES = [
  { value: 'javascript', label: 'JS',     ext: 'js',     color: 'text-yellow-400' },
  { value: 'typescript', label: 'TS',     ext: 'ts',     color: 'text-blue-400'   },
  { value: 'python',     label: 'PY',     ext: 'py',     color: 'text-green-400'  },
  { value: 'java',       label: 'Java',   ext: 'java',   color: 'text-orange-400' },
  { value: 'cpp',        label: 'C++',    ext: 'cpp',    color: 'text-cyan-400'   },
  { value: 'csharp',     label: 'C#',     ext: 'cs',     color: 'text-violet-400' },
  { value: 'go',         label: 'Go',     ext: 'go',     color: 'text-sky-400'    },
  { value: 'rust',       label: 'Rust',   ext: 'rs',     color: 'text-orange-300' },
  { value: 'php',        label: 'PHP',    ext: 'php',    color: 'text-indigo-400' },
  { value: 'ruby',       label: 'Ruby',   ext: 'rb',     color: 'text-red-400'    },
  { value: 'swift',      label: 'Swift',  ext: 'swift',  color: 'text-orange-500' },
  { value: 'kotlin',     label: 'Kotlin', ext: 'kt',     color: 'text-violet-300' },
  { value: 'html',       label: 'HTML',   ext: 'html',   color: 'text-red-300'    },
  { value: 'css',        label: 'CSS',    ext: 'css',    color: 'text-sky-300'    },
  { value: 'sql',        label: 'SQL',    ext: 'sql',    color: 'text-green-300'  },
];

const POST_TYPES = [
  {
    value: 'text', label: 'Text', Icon: FileText,
    active: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/50 dark:text-amber-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
  {
    value: 'image', label: 'Image', Icon: Image,
    active: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/50 dark:text-sky-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
  {
    value: 'video', label: 'Video', Icon: Video,
    active: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/50 dark:text-emerald-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
  {
    value: 'code', label: 'Code', Icon: Code2,
    active: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800/50 dark:bg-violet-950/50 dark:text-violet-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
  {
    value: 'question', label: 'Q&A', Icon: HelpCircle,
    active: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/50 dark:bg-rose-950/50 dark:text-rose-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
  {
    value: 'update', label: 'Update', Icon: Megaphone,
    active: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800/50 dark:bg-indigo-950/50 dark:text-indigo-200',
    idle: 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground',
  },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', Icon: Globe },
  { value: 'college_only', label: 'College', Icon: Building2 },
  { value: 'private', label: 'Private', Icon: Lock },
];

function mentionTokenFromUser(u) {
  const a = (u.first_name || '').replace(/\s+/g, '');
  const b = (u.last_name || '').replace(/\s+/g, '');
  if (a || b) return `${a}${b}`;
  const n = (u.name || '').replace(/\s+/g, '');
  return n || `user${String(u.id).slice(0, 6)}`;
}

function displayName(u) {
  if (!u) return 'You';
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || u.name || u.email || 'You';
}

function userAvatarSrc(u) {
  const raw = u?.avatar_url || u?.profile_picture;
  if (!raw) return FALLBACK_AVATAR;
  return resolveMediaUrl(raw) || FALLBACK_AVATAR;
}

const CreatePost = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [postText, setPostText] = useState('');
  const [cursor, setCursor] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [postType, setPostType] = useState('text');
  const [visibility, setVisibility] = useState('public');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeEditorText, setCodeEditorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [hashtagHighlight, setHashtagHighlight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const codeEditorRef = useRef(null);
  const mentionListRef = useRef(null);
  const hashtagListRef = useRef(null);
  const mirrorInnerRef = useRef(null);

  const composerName = useMemo(() => displayName(user), [user]);
  const avatarSrc = userAvatarSrc(user);

  const mentionCtx = useMemo(() => getMentionContext(postText, cursor), [postText, cursor]);
  const hashtagCtx = useMemo(() => getHashtagContext(postText, cursor), [postText, cursor]);
  const activeAutocomplete = useMemo(() => getActiveComposerAutocomplete(postText, cursor), [postText, cursor]);

  const hashtagFiltered = useMemo(() => {
    if (!hashtagCtx) return [];
    const pool = trendingHashtags.length > 0 ? trendingHashtags : FALLBACK_HASHTAGS;
    const q = hashtagCtx.query.toLowerCase();
    return pool.filter(t => q.length === 0 ? true : t.toLowerCase().startsWith(q)).slice(0, 20);
  }, [hashtagCtx, trendingHashtags]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tags = await postService.getTrendingHashtags();
        if (cancelled || !Array.isArray(tags) || tags.length === 0) return;
        const normalized = tags.map(t => typeof t === 'string' ? t : t?.tag || t?.name).filter(Boolean);
        if (normalized.length) setTrendingHashtags(normalized);
      } catch { /* keep FALLBACK_HASHTAGS */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const runMentionSearch = useCallback(async (q) => {
    const needle = q.trim();
    if (!needle) { setMentionSuggestions([]); return; }
    setMentionLoading(true);
    try {
      const { users } = await userService.searchUsers(needle, { limit: 8 });
      setMentionSuggestions(Array.isArray(users) ? users : []);
    } catch {
      setMentionSuggestions([]);
    } finally {
      setMentionLoading(false);
    }
  }, []);

  const debouncedMentionSearch = useDebouncedCallback(runMentionSearch, 260);

  useEffect(() => {
    if (getActiveComposerAutocomplete(postText, cursor).kind !== 'mention') {
      setMentionSuggestions([]);
      setMentionHighlight(0);
      return;
    }
    const m = getMentionContext(postText, cursor);
    if (!m) { setMentionSuggestions([]); setMentionHighlight(0); return; }
    setMentionHighlight(0);
    if (m.query.length < 1) { setMentionSuggestions([]); return; }
    debouncedMentionSearch(m.query);
  }, [postText, cursor, debouncedMentionSearch]);

  useEffect(() => {
    if (activeAutocomplete.kind === 'hashtag' && hashtagCtx) setHashtagHighlight(0);
  }, [hashtagCtx?.start, hashtagCtx?.query, activeAutocomplete.kind]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    const inner = mirrorInnerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 320);
    el.style.height = `${Math.max(next, 84)}px`;
    if (inner) inner.style.minHeight = `${el.scrollHeight}px`;
  }, [postText, scrollTop]);

  useLayoutEffect(() => {
    const el = codeEditorRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(Math.min(el.scrollHeight, 360), 140)}px`;
  }, [codeEditorText]);

  useEffect(() => {
    const hi = mentionListRef.current?.querySelector?.(`[data-idx="${mentionHighlight}"]`);
    hi?.scrollIntoView?.({ block: 'nearest' });
  }, [mentionHighlight, mentionSuggestions]);

  useEffect(() => {
    const hi = hashtagListRef.current?.querySelector?.(`[data-hidx="${hashtagHighlight}"]`);
    hi?.scrollIntoView?.({ block: 'nearest' });
  }, [hashtagHighlight, hashtagFiltered]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (index) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace('#', '');
    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags(prev => [...prev, tag]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (tagToRemove) => setHashtags(prev => prev.filter(tag => tag !== tagToRemove));

  const applyMention = useCallback((u) => {
    const ctx = getMentionContext(postText, cursor);
    if (!ctx) return;
    const token = mentionTokenFromUser(u);
    const insert = `@${token} `;
    const newText = postText.slice(0, ctx.start) + insert + postText.slice(cursor);
    setPostText(newText);
    setMentionedUserIds(prev => {
      const id = String(u.id);
      return prev.includes(id) ? prev : [...prev, id];
    });
    setMentionSuggestions([]);
    const pos = ctx.start + insert.length;
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); setCursor(pos); }
    });
  }, [postText, cursor]);

  const applyHashtag = useCallback((tagName) => {
    const ctx = getHashtagContext(postText, cursor);
    if (!ctx) return;
    const safe = String(tagName).replace(/^#/, '');
    if (!safe) return;
    const insert = `#${safe} `;
    const newText = postText.slice(0, ctx.start) + insert + postText.slice(cursor);
    setPostText(newText);
    const pos = ctx.start + insert.length;
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); setCursor(pos); }
    });
  }, [postText, cursor]);

  const handleTextareaChange = (e) => {
    setPostText(e.target.value);
    setCursor(e.target.selectionStart ?? e.target.value.length);
  };

  const handleKeyDown = (e) => {
    const val = e.currentTarget.value;
    const pos = e.currentTarget.selectionStart ?? 0;
    const active = getActiveComposerAutocomplete(val, pos);

    if (active.kind === 'mention') {
      const m = getMentionContext(val, pos);
      const list = mentionSuggestions;
      if (m && m.query.length >= 1 && list.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setMentionHighlight(i => Math.min(i + 1, list.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setMentionHighlight(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const pick = list[mentionHighlight]; if (pick) applyMention(pick); return; }
        if (e.key === 'Tab') { e.preventDefault(); applyMention(list[mentionHighlight]); return; }
      }
      if (e.key === 'Escape' && m) { e.preventDefault(); setMentionSuggestions([]); }
    } else if (active.kind === 'hashtag') {
      const h = getHashtagContext(val, pos);
      const list = hashtagFiltered;
      if (h && h.query.length >= 1 && list.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHashtagHighlight(i => Math.min(i + 1, list.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setHashtagHighlight(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const pick = list[hashtagHighlight]; if (pick) applyHashtag(pick); return; }
        if (e.key === 'Tab') { e.preventDefault(); applyHashtag(list[hashtagHighlight]); return; }
      }
    }
  };

  const handleSubmit = async () => {
    const hasMedia = selectedFiles.length > 0;
    const hasCode = postType === 'code' && codeEditorText.trim();
    if (!postText.trim() && !hasMedia && !hasCode) return;
    setLoading(true);
    setError('');
    try {
      let effectiveType = postType;
      if (hasMedia) {
        const m = selectedFiles[0].type || '';
        if (m.startsWith('image/')) effectiveType = 'image';
        else if (m.startsWith('video/')) effectiveType = 'video';
      }

      let submitContent;
      if (effectiveType === 'code') {
        const caption = postText.trim();
        const code = codeEditorText.trim();
        submitContent = caption && code
          ? `${caption}${CODE_SEPARATOR}${code}`
          : code || caption || (hasMedia ? ' ' : '');
      } else {
        submitContent = postText.trim() || (hasMedia ? ' ' : '');
      }

      const fromBody = extractHashtagNamesFromText(postText);
      const mergedTags = [...new Set([...hashtags.filter(Boolean), ...fromBody])];
      const postData = {
        content: submitContent,
        type: effectiveType,
        visibility,
        hashtags: mergedTags.length > 0 ? mergedTags : undefined,
        media: hasMedia ? selectedFiles : undefined,
        code_language: codeLanguage || undefined,
        mentioned_users: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      };
      const newPost = await postService.createPost(postData);
      onPostCreated(newPost);
      emitNotificationsChanged();
      setPostText(''); setSelectedFiles([]); setHashtags([]); setHashtagInput('');
      setPostType('text'); setVisibility('public'); setCodeLanguage('javascript');
      setCodeEditorText(''); setMentionedUserIds([]); setError('');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const showMentionPanel =
    activeAutocomplete.kind === 'mention' &&
    mentionCtx &&
    (mentionCtx.query.length < 1 || mentionLoading || mentionSuggestions.length > 0 ||
      (mentionCtx.query.length >= 1 && !mentionLoading && mentionSuggestions.length === 0));

  const showHashtagPanel =
    activeAutocomplete.kind === 'hashtag' &&
    hashtagCtx &&
    (hashtagFiltered.length > 0 || (hashtagCtx.query.length >= 1 && hashtagFiltered.length === 0));

  const charPct = postText.length / 500;
  const circumference = 2 * Math.PI * 9;

  return (
    <div data-mention-root className="composer-card relative">

      {/* ── Error banner ──────────────────────────────────────── */}
      {error ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
          <X className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* ── Author + visibility row ───────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar
            src={avatarSrc}
            alt={composerName}
            size="md"
            status={PRESENCE_STATUS.ONLINE}
            fallbackSrc={FALLBACK_AVATAR}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold tracking-tight text-foreground leading-tight truncate">{composerName}</span>
              <PresenceLabel status={PRESENCE_STATUS.ONLINE} />
            </div>
            <p className="text-[11.5px] font-medium text-muted-foreground/80 leading-tight mt-1 tracking-tight">Posting to your feed</p>
          </div>
        </div>

        {/* Visibility segmented control */}
        <div className="flex shrink-0 items-center rounded-full border border-border/60 bg-muted/30 p-0.5">
          {VISIBILITY_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              title={label}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-tight transition-all duration-150',
                visibility === value
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border/40'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Textarea + autocomplete ───────────────────────────── */}
      <div className="relative">
        <div className={cn(
          'relative overflow-hidden rounded-xl border border-border/60 bg-muted/20',
          'transition-all duration-200',
          'focus-within:border-primary/40 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/10',
        )}>
          {/* Syntax highlight mirror */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl" aria-hidden>
            <div className="px-4 py-3.5">
              <div
                ref={mirrorInnerRef}
                className="text-left text-[15px] leading-relaxed"
                style={{ transform: `translateY(-${scrollTop}px)` }}
              >
                <div className="whitespace-pre-wrap break-words">
                  <SocialTextSpans text={postText} />
                </div>
              </div>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={postText}
            onChange={handleTextareaChange}
            onSelect={e => setCursor(e.target.selectionStart ?? 0)}
            onClick={e => setCursor(e.currentTarget.selectionStart ?? 0)}
            onKeyUp={e => setCursor(e.currentTarget.selectionStart ?? 0)}
            onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
            onKeyDown={handleKeyDown}
            placeholder={
              postType === 'code'
                ? 'Add a caption or describe your code… (optional)'
                : 'What\'s on your mind? @mention people · #hashtag topics'
            }
            rows={postType === 'code' ? 2 : 3}
            maxLength={500}
            spellCheck
            className={cn(
              'relative z-10 min-h-[60px] w-full max-h-[320px] resize-none overflow-y-auto border-0 bg-transparent px-4 py-3.5',
              '[scrollbar-gutter:stable]',
              'text-[15px] leading-relaxed text-transparent caret-foreground',
              'placeholder:text-muted-foreground/55 placeholder:text-[14px]',
              'focus:outline-none focus:ring-0',
            )}
            aria-label="Post content"
          />
        </div>

        {/* Mention autocomplete */}
        {showMentionPanel && mentionCtx ? (
          <div
            className={cn(
              'absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg',
              'animate-fade-in',
            )}
            role="listbox"
            aria-label="Mention suggestions"
          >
            {mentionCtx.query.length < 1 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <AtSign className="h-4 w-4 shrink-0 opacity-70" />
                Type a name after @ to search people
              </div>
            ) : mentionLoading ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : mentionSuggestions.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-muted-foreground">No people found</div>
            ) : (
              <ul ref={mentionListRef} className="max-h-52 overflow-y-auto py-1">
                {mentionSuggestions.map((u, idx) => {
                  const active = idx === mentionHighlight;
                  const name = displayName(u);
                  const sub = u.user_type || u.role ? String(u.user_type || u.role).replace('_', ' ') : '';
                  return (
                    <li key={String(u.id)}>
                      <button
                        type="button"
                        data-idx={idx}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                          active ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted/80',
                        )}
                        onMouseEnter={() => setMentionHighlight(idx)}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => applyMention(u)}
                      >
                        <img
                          src={userAvatarSrc(u)}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                          onError={e => { e.currentTarget.src = FALLBACK_AVATAR; }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{name}</span>
                          {sub ? (
                            <span className="block truncate text-xs capitalize text-muted-foreground">{sub}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}

        {/* Hashtag autocomplete */}
        {showHashtagPanel && hashtagCtx ? (
          <div
            className={cn(
              'absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg',
              'animate-fade-in',
            )}
            role="listbox"
            aria-label="Hashtag suggestions"
          >
            {hashtagCtx.query.length === 0 && hashtagFiltered.length > 0 ? (
              <div className="border-b border-border/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trending &amp; matching
              </div>
            ) : null}
            {hashtagFiltered.length === 0 && hashtagCtx.query.length >= 1 ? (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Hash className="h-4 w-4 shrink-0 opacity-70" />
                No hashtags match &ldquo;{hashtagCtx.query}&rdquo;
              </div>
            ) : hashtagFiltered.length === 0 ? (
              <div className="px-3 py-2.5 text-sm text-muted-foreground">
                Type letters after # to search tags
              </div>
            ) : (
              <ul ref={hashtagListRef} className="max-h-52 overflow-y-auto py-1">
                {hashtagFiltered.map((tag, idx) => {
                  const active = idx === hashtagHighlight;
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        data-hidx={idx}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold transition-colors',
                          active ? 'bg-primary/10 text-foreground' : 'text-foreground/90 hover:bg-muted/80',
                        )}
                        onMouseEnter={() => setHashtagHighlight(idx)}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => applyHashtag(tag)}
                      >
                        <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span><span className="text-foreground/80">#</span>{tag}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Post type chips ───────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {POST_TYPES.map(({ value, label, Icon, active: activeClass, idle }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPostType(value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150',
              postType === value ? activeClass : idle,
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Code snippet block (code type only) ─────────────────── */}
      {postType === 'code' ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-violet-400/30 bg-gray-950 shadow-lg">

          {/* Language selector strip */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] bg-[#161b22] px-3 py-2 scrollbar-hide">
            <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-600">Lang</span>
            {LANGUAGES.map(lang => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setCodeLanguage(lang.value)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1 text-[11px] font-mono font-semibold transition-all duration-100',
                  codeLanguage === lang.value
                    ? `bg-violet-500/20 ${lang.color} ring-1 ring-violet-500/40`
                    : 'text-gray-500 hover:bg-white/5 hover:text-gray-300',
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* macOS editor title bar */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#1c2128] px-4 py-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </span>
            <span className="font-mono text-[11px] text-gray-500">
              {`snippet.${LANGUAGES.find(l => l.value === codeLanguage)?.ext ?? 'txt'}`}
            </span>
            <span className={cn(
              'ml-auto font-mono text-[11px] font-semibold',
              LANGUAGES.find(l => l.value === codeLanguage)?.color ?? 'text-violet-300',
            )}>
              {LANGUAGES.find(l => l.value === codeLanguage)?.label ?? 'Code'}
            </span>
          </div>

          {/* Code textarea */}
          <textarea
            ref={codeEditorRef}
            value={codeEditorText}
            onChange={e => setCodeEditorText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const ta = e.currentTarget;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const next = codeEditorText.slice(0, start) + '  ' + codeEditorText.slice(end);
                setCodeEditorText(next);
                requestAnimationFrame(() => {
                  ta.selectionStart = ta.selectionEnd = start + 2;
                });
              }
            }}
            placeholder={`// Write your ${LANGUAGES.find(l => l.value === codeLanguage)?.label ?? 'code'} here…`}
            rows={6}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={cn(
              'min-h-[140px] w-full max-h-[360px] resize-none overflow-y-auto border-0 bg-[#0d1117] px-4 pb-4 pt-3.5',
              'font-mono text-[13px] leading-relaxed text-gray-100 caret-violet-400',
              'placeholder:font-mono placeholder:text-[13px] placeholder:text-gray-700',
              'focus:outline-none focus:ring-0',
            )}
            aria-label="Code content"
          />
        </div>
      ) : null}

      {/* ── File previews ─────────────────────────────────────── */}
      {selectedFiles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => {
            const isVideo = file.type?.startsWith('video/');
            return (
              <div
                key={`${file.name}-${index}`}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
              >
                <span className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isVideo
                    ? 'bg-emerald-100 dark:bg-emerald-950/60'
                    : file.type?.startsWith('image/')
                      ? 'bg-sky-100 dark:bg-sky-950/60'
                      : 'bg-amber-100 dark:bg-amber-950/60',
                )}>
                  {isVideo
                    ? <Video className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    : file.type?.startsWith('image/')
                      ? <Image className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      : <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                  }
                </span>
                <div className="min-w-0">
                  <p className="max-w-[140px] truncate text-xs font-medium text-foreground">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label="Remove file"
                  className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── Hashtag tag strip ─────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {hashtags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/15"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeHashtag(tag)}
              aria-label={`Remove #${tag}`}
              className="transition-colors hover:text-destructive ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 rounded-full border border-border/50 bg-transparent px-2.5 py-1 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-150">
          <Hash className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <input
            type="text"
            value={hashtagInput}
            onChange={e => setHashtagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
            placeholder="Add tag…"
            className="w-20 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
          {hashtagInput.trim() ? (
            <button
              type="button"
              onClick={addHashtag}
              disabled={hashtags.length >= 10}
              className="ml-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              +
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Action footer ─────────────────────────────────────── */}
      <div className="mt-4 border-t border-border/50 pt-3.5">
        <div className="flex items-center justify-between gap-2">

          {/* Left: action buttons */}
          <div className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-hide">
            {/* Consolidated media button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-muted-foreground transition-all duration-150 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-medium sm:inline">Media</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              aria-expanded={showEmojiPicker}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-muted-foreground transition-all duration-150 hover:bg-yellow-50 hover:text-yellow-700 dark:hover:bg-yellow-950/30 dark:hover:text-yellow-400"
            >
              <Smile className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-medium sm:inline">Emoji</span>
            </button>

            {/* Insert # shortcut */}
            <button
              type="button"
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const pos = ta.selectionStart ?? ta.value.length;
                const newText = postText.slice(0, pos) + '#' + postText.slice(pos);
                setPostText(newText);
                const next = pos + 1;
                setCursor(next);
                requestAnimationFrame(() => {
                  ta.focus();
                  ta.setSelectionRange(next, next);
                });
              }}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-muted-foreground transition-all duration-150 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950/30 dark:hover:text-violet-400"
            >
              <Hash className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm font-medium sm:inline">Tag</span>
            </button>

            <span className="mx-1 hidden h-4 w-px bg-border/60 sm:inline-block" />

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">Location</span>
            </button>
          </div>

          {/* Right: circular char counter + post button */}
          <div className="flex shrink-0 items-center gap-2.5">
            {postText ? (
              <div className="relative flex h-7 w-7 items-center justify-center" title={`${postText.length}/500 characters`}>
                <svg className="-rotate-90 h-7 w-7" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                  <circle
                    cx="12" cy="12" r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - charPct)}
                    strokeLinecap="round"
                    className={cn(
                      'transition-all duration-150',
                      postText.length > 480 ? 'text-destructive' : postText.length > 400 ? 'text-amber-500' : 'text-primary',
                    )}
                  />
                </svg>
                {postText.length > 400 ? (
                  <span className={cn(
                    'absolute text-[8px] font-bold tabular-nums',
                    postText.length > 480 ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {500 - postText.length}
                  </span>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!postText.trim() && selectedFiles.length === 0) || loading}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200',
                (postText.trim() || selectedFiles.length > 0) && !loading
                  ? 'btn-primary'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting…</span>
                </>
              ) : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.js,.py,.java,.cpp,.c,.html,.css,.json"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default CreatePost;
