// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Search, X, GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import globalQuestionService from '@/services/globalQuestionService';
import { userDisplayName, avatarOrFallback } from './teacherCenterUtils';

export default function TeacherTagPicker({ selected, onChange }) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { teachers } = await globalQuestionService.searchTeachers(query.trim());
        const selectedIds = new Set(selected.map((t) => String(t.id)));
        setResults((teachers || []).filter((t) => !selectedIds.has(String(t.id))));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, selected]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const addTeacher = (t) => {
    if (selected.some((s) => String(s.id) === String(t.id))) return;
    onChange([...selected, t]);
    setQuery('');
    setResults([]);
  };

  const removeTeacher = (id) => {
    onChange(selected.filter((t) => String(t.id) !== String(id)));
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-foreground">Tag teachers (any college)</label>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
            >
              <img
                src={avatarOrFallback(t, currentUser)}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
              {userDisplayName(t)}
              <button type="button" onClick={() => removeTeacher(t.id)} className="rounded-full p-0.5 hover:bg-violet-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Search teachers by name…"
          className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-600" />
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg">
          {results.length === 0 && !loading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No teachers found</li>
          ) : (
            results.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => addTeacher(t)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                >
                  <img
                    src={avatarOrFallback(t, currentUser)}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-violet-100"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{userDisplayName(t)}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      {t.college_name || 'Global campus'}
                      {t.department ? ` · ${t.department}` : ''}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
