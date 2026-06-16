import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileText,
  Hash,
  Search,
  SearchX,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import { HighlightMatch } from '@/components/HighlightMatch';
import { resolveMediaUrl } from '@/services/postService';
import {
  alternativeSearchTerms,
  filterSearchSuggestions,
} from '@/lib/searchSuggestions';

const FALLBACK_AVATAR =
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150';

function headerAvatarSrc(url) {
  return resolveMediaUrl(url || '') || url || FALLBACK_AVATAR;
}

function formatDisplayLabel(text) {
  if (!text || typeof text !== 'string') return text || '';
  const t = text.trim();
  if (!t) return '';
  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 2 && letters === letters.toUpperCase()) {
    return t.toLowerCase().replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  }
  return t;
}

function SearchSuggestionsPanel({
  query,
  recentSearches,
  onTextSearch,
  onRemoveRecent,
  onClearRecent,
}) {
  const { recent, suggested } = filterSearchSuggestions(query, recentSearches);
  const trimmed = query.trim();

  return (
    <div className="global-search-panel global-search-panel--idle">
      {recent.length > 0 ? (
        <section className="global-search-panel__section">
          <div className="global-search-panel__section-head">
            <h3 className="global-search-panel__section-label">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span>Recent searches</span>
            </h3>
            <button
              type="button"
              className="global-search-panel__clear-all"
              onMouseDown={(event) => {
                event.preventDefault();
                onClearRecent?.();
              }}
            >
              Clear all
            </button>
          </div>
          <ul className="global-search-panel__list">
            {recent.map((term) => (
              <li key={term} className="global-search-panel__recent-item">
                <button
                  type="button"
                  className="global-search-panel__suggestion-row"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onTextSearch?.(term);
                  }}
                >
                  <Clock className="global-search-panel__suggestion-icon" aria-hidden />
                  <span className="global-search-panel__suggestion-text">{term}</span>
                </button>
                <button
                  type="button"
                  className="global-search-panel__remove-recent"
                  aria-label={`Remove ${term} from recent searches`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemoveRecent?.(term);
                  }}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {trimmed && suggested.length > 0 ? (
        <section className="global-search-panel__section">
          <h3 className="global-search-panel__section-label">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            <span>Matching suggestions</span>
          </h3>
          <div className="global-search-panel__chips">
            {suggested.map((item) => (
              <button
                key={item.query}
                type="button"
                className="global-search-panel__chip"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onTextSearch?.(item.query);
                }}
              >
                {item.query.startsWith('#') ? (
                  <Hash className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                ) : (
                  <Search className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                )}
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!recent.length && !trimmed ? (
        <div className="global-search-panel__empty">
          <Search className="global-search-panel__empty-icon" aria-hidden />
          <p className="global-search-panel__empty-title">Start typing to search</p>
          <p className="global-search-panel__empty-hint">Find people, posts, jobs, communities, and events</p>
        </div>
      ) : null}

      {!recent.length && trimmed && !suggested.length ? (
        <div className="global-search-panel__empty">
          <Search className="global-search-panel__empty-icon" aria-hidden />
          <p className="global-search-panel__empty-title">No matching suggestions</p>
          <p className="global-search-panel__empty-hint">Try a different keyword or keep typing for full results</p>
        </div>
      ) : null}
    </div>
  );
}

function SearchEmptyResults({ query, onTextSearch }) {
  const alternatives = alternativeSearchTerms(query);

  return (
    <div className="global-search-panel global-search-panel--empty-results">
      <div className="global-search-panel__empty">
        <SearchX className="global-search-panel__empty-icon" aria-hidden />
        <p className="global-search-panel__empty-title">No matching results found</p>
        <p className="global-search-panel__empty-hint">
          We couldn&apos;t find anything for &ldquo;{query}&rdquo;. Try one of these instead:
        </p>
      </div>
      <div className="global-search-panel__chips global-search-panel__chips--centered">
        {alternatives.map((item) => (
          <button
            key={item.query}
            type="button"
            className="global-search-panel__chip"
            onMouseDown={(event) => {
              event.preventDefault();
              onTextSearch?.(item.query);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlobalSearchPanel({
  query,
  debouncedQuery,
  loading,
  results,
  totalHits,
  recentSearches = [],
  focusedIdx,
  onItemMouseDown,
  onTextSearch,
  onRemoveRecent,
  onClearRecent,
  itemRefs,
  textSnippet,
}) {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return (
      <SearchSuggestionsPanel
        query={trimmed}
        recentSearches={recentSearches}
        onTextSearch={onTextSearch}
        onRemoveRecent={onRemoveRecent}
        onClearRecent={onClearRecent}
      />
    );
  }

  if (loading && !results) {
    return (
      <div className="global-search-panel__loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="global-search-panel__skeleton-row">
            <div className="global-search-panel__skeleton-avatar" />
            <div className="global-search-panel__skeleton-lines">
              <div className="global-search-panel__skeleton-line global-search-panel__skeleton-line--wide" />
              <div className="global-search-panel__skeleton-line global-search-panel__skeleton-line--narrow" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const empty = !loading && results && totalHits === 0;

  if (empty) {
    return <SearchEmptyResults query={trimmed} onTextSearch={onTextSearch} />;
  }

  const hasError = results && Object.keys(results.errors || {}).length > 0;
  let flatIdx = 0;

  const section = (icon, label, items, renderItem) => {
    if (!items?.length) return null;
    const startIdx = flatIdx;
    flatIdx += items.length;
    return (
      <section className="global-search-panel__section">
        <h3 className="global-search-panel__section-label">
          {icon}
          <span>{label}</span>
        </h3>
        <ul className="global-search-panel__list">{items.map((item, i) => renderItem(item, startIdx + i))}</ul>
      </section>
    );
  };

  return (
    <div className="global-search-panel">
      {hasError ? (
        <div className="global-search-panel__notice">
          Some categories could not be loaded. Showing partial results.
        </div>
      ) : null}

      {section(
        <Users className="h-3.5 w-3.5" aria-hidden />,
        'People',
        results?.users,
        (u, idx) => (
          <li key={u.id}>
            <div
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--person ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
            >
              <button
                type="button"
                className="global-search-panel__row-main"
                onMouseDown={() => onItemMouseDown({ type: 'user', data: u })}
              >
                <UserAvatar
                  src={headerAvatarSrc(u.avatar_url)}
                  alt={formatDisplayLabel(u.name) || 'User'}
                  size="sm"
                  showStatus={false}
                  fallbackSrc={FALLBACK_AVATAR}
                />
                <span className="global-search-panel__row-text">
                  <span className="global-search-panel__row-title">
                    <HighlightMatch text={formatDisplayLabel(u.name) || 'User'} query={debouncedQuery} />
                  </span>
                  <AcademicIdentityLine
                    user={u}
                    className="global-search-panel__row-identity line-clamp-2"
                  />
                </span>
              </button>
              <button
                type="button"
                className="global-search-panel__row-action"
                onMouseDown={() => onItemMouseDown({ type: 'message', data: u })}
              >
                Message
              </button>
            </div>
          </li>
        ),
      )}

      {section(
        <FileText className="h-3.5 w-3.5" aria-hidden />,
        'Posts',
        results?.posts,
        (p, idx) => (
          <li key={p.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'post', data: p })}
            >
              <span className="global-search-panel__row-meta">
                {formatDisplayLabel(p.user?.name) || 'Member'}
              </span>
              <span className="global-search-panel__row-snippet">
                <HighlightMatch text={textSnippet(p.content)} query={debouncedQuery} />
              </span>
            </button>
          </li>
        ),
      )}

      {section(
        <Building2 className="h-3.5 w-3.5" aria-hidden />,
        'Communities',
        results?.communities,
        (c, idx) => (
          <li key={c.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'community', data: c })}
            >
              <span className="global-search-panel__row-title">
                <HighlightMatch text={formatDisplayLabel(c.name)} query={debouncedQuery} />
              </span>
              {c.description ? (
                <span className="global-search-panel__row-snippet">
                  <HighlightMatch text={textSnippet(c.description, 100)} query={debouncedQuery} />
                </span>
              ) : null}
            </button>
          </li>
        ),
      )}

      {section(
        <Briefcase className="h-3.5 w-3.5" aria-hidden />,
        'Jobs',
        results?.jobs,
        (j, idx) => {
          const title = j.title || j.job_title || 'Role';
          return (
            <li key={j.id}>
              <button
                type="button"
                ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
                data-idx={idx}
                className={`global-search-panel__row global-search-panel__row--stacked ${
                  focusedIdx === idx ? 'global-search-panel__row--focused' : ''
                }`}
                onMouseDown={() => onItemMouseDown({ type: 'job', data: j })}
              >
                <span className="global-search-panel__row-title">
                  <HighlightMatch text={formatDisplayLabel(title)} query={debouncedQuery} />
                </span>
                {j.company_name ? (
                  <span className="global-search-panel__row-meta">{j.company_name}</span>
                ) : null}
              </button>
            </li>
          );
        },
      )}

      {section(
        <Calendar className="h-3.5 w-3.5" aria-hidden />,
        'Events',
        results?.events,
        (ev, idx) => (
          <li key={ev.id}>
            <button
              type="button"
              ref={(el) => { if (itemRefs) itemRefs.current[idx] = el; }}
              data-idx={idx}
              className={`global-search-panel__row global-search-panel__row--stacked ${
                focusedIdx === idx ? 'global-search-panel__row--focused' : ''
              }`}
              onMouseDown={() => onItemMouseDown({ type: 'event', data: ev })}
            >
              <span className="global-search-panel__row-title">
                <HighlightMatch text={formatDisplayLabel(ev.title) || 'Event'} query={debouncedQuery} />
              </span>
              {ev.start_date ? (
                <span className="global-search-panel__row-meta">{String(ev.start_date)}</span>
              ) : null}
            </button>
          </li>
        ),
      )}
    </div>
  );
}
