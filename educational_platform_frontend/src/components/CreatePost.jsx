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
  Lock,
  Code2,
  HelpCircle,
  Megaphone,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { resolveMediaUrl } from '@/services/postService';
import UserAvatar from '@/components/ui/UserAvatar';
import postService from '@/services/postService';
import socialComposerService from '@/services/socialComposerService';
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
import ComposerEmojiPicker from '@/components/composer/ComposerEmojiPicker';
import {
  normalizeCodeFileName,
  sanitizeCodeFileNameInput,
} from '@/lib/codePostMeta';

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

const MAX_CHARS = 2000;
const DRAFT_KEY = 'vh:composer-draft';

const POST_TYPE_PLACEHOLDERS = {
  text: 'Share an idea, ask the class, start a thread…',
  image: 'Describe your photo or album before you attach media…',
  video: 'What is this video about? Add context for viewers…',
  code: 'Add a caption or describe your code… (optional)',
  question: 'Ask a clear question — classmates and teachers can help…',
  update: 'Share a campus update, milestone, or announcement…',
};

const POST_TYPES = [
  { value: 'text', label: 'Text', Icon: FileText },
  { value: 'image', label: 'Image', Icon: Image },
  { value: 'video', label: 'Video', Icon: Video },
  { value: 'code', label: 'Code', Icon: Code2 },
  { value: 'question', label: 'Q&A', Icon: HelpCircle },
  { value: 'update', label: 'Update', Icon: Megaphone },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', Icon: Globe, hint: 'Visible to everyone on the platform' },
  { value: 'private', label: 'Private', Icon: Lock, hint: 'Only you can see this post' },
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [postType, setPostType] = useState('text');
  const [visibility, setVisibility] = useState('public');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeFileName, setCodeFileName] = useState('');
  const [codeEditorText, setCodeEditorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState([]);
  const [hashtagLoading, setHashtagLoading] = useState(false);
  const [hashtagHighlight, setHashtagHighlight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

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
    const q = hashtagCtx.query.toLowerCase();

    const fromApi = hashtagSuggestions.map(x =>
      typeof x === 'string' ? { tag: x, count: 0 } : x,
    );

    const popularSource = trendingHashtags.length > 0 ? trendingHashtags : FALLBACK_HASHTAGS;
    const fromPopular = popularSource.map(tag => ({
      tag: typeof tag === 'string' ? tag : tag.tag || tag.name || '',
      count: typeof tag === 'object' && tag?.count ? tag.count : 0,
    }));

    const merged = new Map();
    [...fromApi, ...fromPopular].forEach(item => {
      const name = String(item.tag || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (merged.has(key)) return;
      if (!q || name.toLowerCase().includes(q)) {
        merged.set(key, { tag: name, count: item.count || 0 });
      }
    });

    return [...merged.values()]
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 20);
  }, [hashtagCtx, hashtagSuggestions, trendingHashtags]);

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

  const debouncedHashtagSearch = useDebouncedCallback(async (query) => {
    setHashtagLoading(true);
    try {
      const results = await socialComposerService.searchHashtags(query, 20);
      setHashtagSuggestions(results);
    } catch {
      setHashtagSuggestions([]);
    } finally {
      setHashtagLoading(false);
    }
  }, 220);

  useEffect(() => {
    if (activeAutocomplete.kind !== 'hashtag' || !hashtagCtx) {
      setHashtagSuggestions([]);
      setHashtagLoading(false);
      return;
    }
    setHashtagHighlight(0);
    debouncedHashtagSearch(hashtagCtx.query);
  }, [activeAutocomplete.kind, hashtagCtx?.start, hashtagCtx?.query, debouncedHashtagSearch]);

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

  const openMediaPicker = useCallback((mode) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = mode === 'image'
      ? 'image/*'
      : mode === 'video'
        ? 'video/*'
        : 'image/*,video/*,.pdf,.doc,.docx,.txt,.js,.py,.java,.cpp,.c,.html,.css,.json';
    input.click();
  }, []);

  const selectPostType = useCallback((value) => {
    setPostType(value);
    if (value === 'image' || value === 'video') openMediaPicker(value);
  }, [openMediaPicker]);

  const startHashtag = useCallback(() => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? cursor;
    const end = ta?.selectionEnd ?? start;

    if (getHashtagContext(postText, start)) {
      ta?.focus();
      setInputFocused(true);
      return;
    }

    const before = postText.slice(0, start);
    const after = postText.slice(end);
    const needsSpace = before.length > 0 && !/[\s\n]$/.test(before);
    const insert = `${needsSpace ? ' ' : ''}#`;
    const newText = before + insert + after;
    if (newText.length > MAX_CHARS) return;

    setPostText(newText);
    const pos = start + insert.length;
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(pos, pos);
        setCursor(pos);
        setInputFocused(true);
      } else {
        setCursor(pos);
      }
    });
  }, [postText, cursor]);

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

  const insertEmoji = useCallback((emoji) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? cursor;
    const end = ta?.selectionEnd ?? start;
    const newText = postText.slice(0, start) + emoji + postText.slice(end);
    if (newText.length > MAX_CHARS) return;
    setPostText(newText);
    const pos = start + emoji.length;
    requestAnimationFrame(() => {
      if (ta) {
        ta.focus();
        ta.setSelectionRange(pos, pos);
        setCursor(pos);
      } else {
        setCursor(pos);
      }
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
      if (h && list.length > 0) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHashtagHighlight(i => Math.min(i + 1, list.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setHashtagHighlight(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const pick = list[hashtagHighlight]; if (pick) applyHashtag(pick.tag ?? pick); return; }
        if (e.key === 'Tab') { e.preventDefault(); const pick = list[hashtagHighlight]; if (pick) applyHashtag(pick.tag ?? pick); return; }
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
      const postData = {
        content: submitContent,
        type: effectiveType,
        visibility,
        hashtags: fromBody.length > 0 ? fromBody : undefined,
        media: hasMedia ? selectedFiles : undefined,
        code_language: codeLanguage || undefined,
        code_file_name: hasCode
          ? normalizeCodeFileName(codeFileName, codeLanguage)
          : undefined,
        mentioned_users: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      };
      const newPost = await postService.createPost(postData);
      onPostCreated(newPost);
      emitNotificationsChanged();
      setPostText(''); setSelectedFiles([]);
      setPostType('text'); setVisibility('public'); setCodeLanguage('javascript');
      setCodeFileName(''); setCodeEditorText(''); setMentionedUserIds([]); setError('');
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
    activeAutocomplete.kind === 'hashtag' && hashtagCtx != null;

  const handleSaveDraft = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        postText,
        postType,
        visibility,
        codeEditorText,
        codeLanguage,
        codeFileName,
      }));
    } catch { /* ignore */ }
  };

  const codeFilePreview = normalizeCodeFileName(codeFileName, codeLanguage);

  const canSubmit =
    (postText.trim() || selectedFiles.length > 0 || (postType === 'code' && codeEditorText.trim())) &&
    postText.length <= MAX_CHARS &&
    !loading;

  const charsLeft = MAX_CHARS - postText.length;
  const charClass =
    postText.length > MAX_CHARS
      ? 'feed-composer__chars feed-composer__chars--over'
      : charsLeft <= 100
        ? 'feed-composer__chars feed-composer__chars--warn'
        : 'feed-composer__chars';

  return (
    <div className="feed-composer-shell">
      <div className="feed-composer-shell__aurora" aria-hidden />
      <article
        data-mention-root
        className={cn('feed-composer', (inputFocused || showMentionPanel || showHashtagPanel) && 'feed-composer--focused')}
        aria-label="Create post"
      >
        <div className="feed-composer__inner">
          {error ? (
            <div className="feed-composer__error">
              <X className="h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
                <X className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          ) : null}

          <header className="feed-composer__header">
            <div className="feed-composer__author">
              <div className="feed-composer__avatar-wrap">
                <UserAvatar
                  src={avatarSrc}
                  alt={composerName}
                  size="md"
                  showStatus={false}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <span className="feed-composer__online" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="feed-composer__name-row">
                  <p className="feed-composer__name">{composerName}</p>
                  <span className="feed-composer__available">
                    <span className="feed-composer__available-dot" aria-hidden />
                    Available
                  </span>
                </div>
                <p className="feed-composer__subtitle">
                  <Sparkles className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Composing a new post
                </p>
              </div>
            </div>

            <div className="feed-composer__audience" role="tablist" aria-label="Post audience">
              {VISIBILITY_OPTIONS.map(({ value, label, Icon, hint }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={visibility === value}
                  title={hint}
                  onClick={() => setVisibility(value)}
                  className={cn(
                    'feed-composer__audience-tab',
                    visibility === value && 'feed-composer__audience-tab--active',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </header>

          <div className="relative">
            <div
              className={cn(
                'feed-composer__field',
                (inputFocused || showMentionPanel || showHashtagPanel) && 'feed-composer__field--focused',
              )}
            >
              <div
                className={cn('feed-composer__field-wash', `feed-composer__field-wash--${postType}`)}
                aria-hidden
              />
              <div className="feed-composer__mirror" aria-hidden>
                <div
                  ref={mirrorInnerRef}
                  style={{ transform: `translateY(-${scrollTop}px)` }}
                >
                  <div className="whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.55] text-foreground">
                    <SocialTextSpans text={postText} />
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
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder={POST_TYPE_PLACEHOLDERS[postType] || POST_TYPE_PLACEHOLDERS.text}
                rows={4}
                maxLength={MAX_CHARS + 100}
                spellCheck
                className="feed-composer__textarea"
                aria-label="Post content"
              />
              <div className="feed-composer__field-footer">
                <p className="feed-composer__hint">
                  Type <kbd>@</kbd> to mention, <kbd>#</kbd> for topics
                </p>
                <span className={charClass} aria-live="polite">
                  {postText.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            {showMentionPanel && mentionCtx ? (
              <div
                className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg animate-fade-in"
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

            {showHashtagPanel && hashtagCtx ? (
              <div
                className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-lg animate-fade-in"
                role="listbox"
                aria-label="Hashtag suggestions"
              >
                {hashtagCtx.query.length === 0 && hashtagFiltered.length > 0 ? (
                  <div className="border-b border-border/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Trending &amp; matching
                  </div>
                ) : null}
                {hashtagLoading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching tags…
                  </div>
                ) : hashtagFiltered.length === 0 && hashtagCtx.query.length >= 1 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4 shrink-0 opacity-70" />
                    No hashtags match &ldquo;{hashtagCtx.query}&rdquo;
                  </div>
                ) : hashtagFiltered.length === 0 ? (
                  <div className="px-3 py-2.5 text-sm text-muted-foreground">
                    Type to search tags
                  </div>
                ) : (
                  <ul ref={hashtagListRef} className="max-h-52 overflow-y-auto py-1">
                    {hashtagFiltered.map((item, idx) => {
                      const tag = item.tag ?? item;
                      const active = idx === hashtagHighlight;
                      return (
                        <li key={String(tag)}>
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

          <div className="feed-composer__types" role="toolbar" aria-label="Post format and tools">
            <ComposerEmojiPicker onSelect={insertEmoji}>
              <button
                type="button"
                className="feed-composer__type feed-composer__type--action"
                aria-label="Emoji"
                onClick={() => textareaRef.current?.focus()}
              >
                <Smile className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                Emoji
              </button>
            </ComposerEmojiPicker>

            {POST_TYPES.slice(0, 3).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={postType === value}
                onClick={() => selectPostType(value)}
                className={cn(
                  'feed-composer__type',
                  postType === value && 'feed-composer__type--active',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}

            <button
              type="button"
              className="feed-composer__type feed-composer__type--action"
              aria-label="Tag"
              onClick={startHashtag}
            >
              <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              Tag
            </button>

            {POST_TYPES.slice(3).map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={postType === value}
                onClick={() => selectPostType(value)}
                className={cn(
                  'feed-composer__type',
                  postType === value && 'feed-composer__type--active',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}

            <button
              type="button"
              className="feed-composer__type feed-composer__type--action"
              aria-label="Location"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              Location
            </button>
          </div>

          {postType === 'code' ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-violet-400/30 bg-gray-950 shadow-lg">
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
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-[#1c2128] px-4 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                </span>
                <Code2 className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                <label className="sr-only" htmlFor="code-file-name">Code file name</label>
                <input
                  id="code-file-name"
                  type="text"
                  value={codeFileName}
                  onChange={(e) => setCodeFileName(sanitizeCodeFileNameInput(e.target.value))}
                  placeholder="File name (e.g. index, app, StudentService)"
                  spellCheck={false}
                  className="min-w-[10rem] flex-1 rounded-md border border-white/10 bg-[#0d1117]/80 px-2.5 py-1 font-mono text-[11px] text-gray-200 placeholder:text-gray-600 focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <span className="shrink-0 font-mono text-[11px] text-gray-500">
                  → {codeFilePreview}
                </span>
              </div>
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
                className="min-h-[140px] w-full max-h-[360px] resize-none overflow-y-auto border-0 bg-[#0d1117] px-4 pb-4 pt-3.5 font-mono text-[13px] leading-relaxed text-gray-100 caret-violet-400 placeholder:text-gray-700 focus:outline-none"
                aria-label="Code content"
              />
            </div>
          ) : null}

          {selectedFiles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                    {file.type?.startsWith('video/')
                      ? <Video className="h-4 w-4 text-emerald-600" />
                      : file.type?.startsWith('image/')
                        ? <Image className="h-4 w-4 text-sky-600" />
                        : <FileText className="h-4 w-4 text-amber-700" />}
                  </span>
                  <div className="min-w-0">
                    <p className="max-w-[140px] truncate text-xs font-medium">{file.name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} aria-label="Remove file">
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="feed-composer__divider" role="separator" />

          <footer className="feed-composer__footer">
            <div className="feed-composer__actions feed-composer__actions--solo">
              <button type="button" className="feed-composer__draft" onClick={handleSaveDraft}>
                Save draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'feed-composer__post',
                  canSubmit ? 'feed-composer__post--ready' : 'feed-composer__post--disabled',
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting…
                  </>
                ) : (
                  <>
                    Post
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.txt,.js,.py,.java,.cpp,.c,.html,.css,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
      </article>
    </div>
  );
};

export default CreatePost;
