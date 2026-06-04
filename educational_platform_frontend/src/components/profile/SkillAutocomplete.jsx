import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import skillsApi from '@/services/skillsApi';
import { PROFILE_SKILLS_MAX } from '@/components/profile/profileLimits';

const DEBOUNCE_MS = 280;

function normalizeForCompare(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export default function SkillAutocomplete({
  value,
  onChange,
  onSelect,
  disabled = false,
  placeholder = 'Type to search skills…',
  existingSkillNames = [],
  className,
  inputClassName,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const requestRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [canCreate, setCanCreate] = useState(false);
  const [createLabel, setCreateLabel] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const existingSet = useRef(new Set());
  useEffect(() => {
    existingSet.current = new Set(
      (existingSkillNames || []).map((n) => normalizeForCompare(n)),
    );
  }, [existingSkillNames]);

  const options = [];
  items.forEach((item) => {
    if (!existingSet.current.has(normalizeForCompare(item.skill_name))) {
      options.push({ type: 'suggest', key: item.id, item });
    }
  });
  if (
    canCreate &&
    createLabel &&
    !existingSet.current.has(normalizeForCompare(createLabel)) &&
    !options.some((o) => normalizeForCompare(o.item.skill_name) === normalizeForCompare(createLabel))
  ) {
    options.push({ type: 'create', key: '__create__', label: createLabel });
  }

  const showDropdown = open && !disabled && (loading || options.length > 0);

  const fetchSuggestions = useCallback(async (query) => {
    const q = String(query || '').trim();
    if (q.length < 1) {
      setItems([]);
      setCanCreate(false);
      setCreateLabel(null);
      setLoading(false);
      return;
    }
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const data = await skillsApi.suggest(q, { limit: 8 });
      if (reqId !== requestRef.current) return;
      setItems(data.items || []);
      setCanCreate(!!data.canCreate);
      setCreateLabel(data.createLabel || null);
    } catch {
      if (reqId !== requestRef.current) return;
      setItems([]);
      setCanCreate(q.length >= 2);
      setCreateLabel(q.length >= 2 ? q : null);
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open || disabled) return undefined;

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, open, disabled, fetchSuggestions]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pickOption = (opt) => {
    if (!opt) return;
    if (opt.type === 'create') {
      onSelect?.({ skill_name: opt.label, isNew: true });
    } else {
      onSelect?.({ skill_id: opt.item.id, skill_name: opt.item.skill_name, isNew: false });
    }
    onChange?.('');
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' && value.trim()) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(options.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) {
        pickOption(options[activeIndex]);
      } else if (options.length === 1) {
        pickOption(options[0]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className={cn('skill-autocomplete', className)}>
      <div className="skill-autocomplete__input-wrap">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className={cn('skill-autocomplete__input', inputClassName)}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={(e) => {
            onChange?.(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          maxLength={120}
        />
        {loading ? (
          <Loader2 className="skill-autocomplete__spinner h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="skill-autocomplete__sparkle h-4 w-4" aria-hidden />
        )}
      </div>

      {showDropdown ? (
        <ul id={listId} role="listbox" className="skill-autocomplete__dropdown">
          {loading && options.length === 0 ? (
            <li className="skill-autocomplete__empty" role="presentation">
              Searching skills…
            </li>
          ) : null}
          {options.map((opt, idx) => (
            <li key={opt.key} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={cn(
                  'skill-autocomplete__option',
                  idx === activeIndex && 'skill-autocomplete__option--active',
                  opt.type === 'create' && 'skill-autocomplete__option--create',
                )}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickOption(opt)}
              >
                {opt.type === 'create' ? (
                  <>
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      Create &ldquo;<strong>{opt.label}</strong>&rdquo;
                    </span>
                  </>
                ) : (
                  <span>{opt.item.skill_name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="skill-autocomplete__hint">
        Up to {PROFILE_SKILLS_MAX} skills · suggestions from the shared skills catalog
      </p>
    </div>
  );
}
