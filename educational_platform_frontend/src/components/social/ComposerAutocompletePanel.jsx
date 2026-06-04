// @ts-nocheck
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Hash, Loader2, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mentionDisplayName, mentionAvatar, mentionTokenFromUser } from '@/utils/mentionUtils';

const PANEL_SHELL =
  'composer-autocomplete z-[200] max-h-[min(17.5rem,42vh)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.06] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/40 dark:ring-white/[0.08] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-300/50 [&::-webkit-scrollbar-track]:bg-transparent';

const ITEM_BASE =
  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200 ease-out hover:bg-violet-500/[0.06] dark:hover:bg-violet-400/[0.08]';

const ITEM_ACTIVE =
  'bg-violet-500/[0.09] shadow-[inset_3px_0_0_0] shadow-violet-500/70 translate-x-0.5 dark:bg-violet-400/10 dark:shadow-violet-400/60';

function mentionHandle(user) {
  return `@${mentionTokenFromUser(user)}`;
}

function mentionSubtitle(user) {
  return user?.college_name || user?.user_type || user?.email || '';
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <li className="list-none px-4 py-5 text-center" role="presentation">
      <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/[0.07] text-violet-600 dark:text-violet-300">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      {subtitle ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </li>
  );
}

function LoadingState({ label }) {
  return (
    <li className="list-none px-4 py-4" role="presentation">
      <div className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-violet-500" aria-hidden />
        <span>{label}</span>
      </div>
    </li>
  );
}

function MentionRow({ user, active, currentUser, onSelect, onHover, itemRef }) {
  return (
    <li className="list-none p-0.5" role="presentation">
      <button
        ref={itemRef}
        type="button"
        role="option"
        aria-selected={active}
        className={cn(ITEM_BASE, active && ITEM_ACTIVE)}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <img
          src={mentionAvatar(user, currentUser)}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/90 shadow-sm dark:ring-slate-800"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            {mentionDisplayName(user)}
          </span>
          <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
            {mentionHandle(user)}
            {mentionSubtitle(user) ? (
              <span className="text-muted-foreground/70"> · {mentionSubtitle(user)}</span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function HashtagRow({ tag, count, active, onSelect, onHover, itemRef }) {
  return (
    <li className="list-none p-0.5" role="presentation">
      <button
        ref={itemRef}
        type="button"
        role="option"
        aria-selected={active}
        className={cn(ITEM_BASE, active && ITEM_ACTIVE)}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/[0.1] text-emerald-700 dark:text-emerald-300">
          <Hash className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            #{tag}
          </span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            {count > 0 ? `${count} ${count === 1 ? 'use' : 'uses'}` : 'New topic'}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Premium floating autocomplete for @mentions and #hashtags.
 */
export default function ComposerAutocompletePanel({
  open,
  coords,
  panelRef,
  kind,
  mentionLoading,
  mentionSuggestions,
  mentionHighlight,
  onMentionHighlight,
  onMentionSelect,
  hashtagLoading,
  hashtagItems,
  hashtagHighlight,
  onHashtagHighlight,
  onHashtagSelect,
  hashtagQuery,
  mentionQuery,
  currentUser,
}) {
  const activeItemRef = useRef(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [mentionHighlight, hashtagHighlight, kind]);

  if (!open || !coords) return null;

  const isMention = kind === 'mention';
  const listId = isMention ? 'composer-mention-listbox' : 'composer-hashtag-listbox';

  const content = (
    <div
      ref={panelRef}
      id={listId}
      role="listbox"
      aria-label={isMention ? 'Mention suggestions' : 'Hashtag suggestions'}
      className={PANEL_SHELL}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
      }}
    >
      <ul className="m-0 list-none p-0">
        {isMention ? (
          mentionLoading ? (
            <LoadingState label="Searching people…" />
          ) : mentionSuggestions.length === 0 ? (
            <EmptyState
              icon={UserRound}
              title={mentionQuery?.length >= 1 ? 'No people found' : 'Mention someone'}
              subtitle={
                mentionQuery?.length >= 1
                  ? 'Try another name or handle'
                  : 'Keep typing after @ to search'
              }
            />
          ) : (
            mentionSuggestions.map((user, idx) => (
              <MentionRow
                key={user.id}
                user={user}
                active={idx === mentionHighlight}
                currentUser={currentUser}
                itemRef={idx === mentionHighlight ? activeItemRef : null}
                onHover={() => onMentionHighlight(idx)}
                onSelect={() => onMentionSelect(user)}
              />
            ))
          )
        ) : hashtagLoading ? (
          <LoadingState label="Searching tags…" />
        ) : hashtagItems.length === 0 ? (
          <EmptyState
            icon={Hash}
            title={hashtagQuery?.length >= 1 ? `Use #${hashtagQuery}` : 'Add a topic'}
            subtitle={
              hashtagQuery?.length >= 1
                ? 'Press space or Enter to apply this tag'
                : 'Type letters after # to browse tags'
            }
          />
        ) : (
          hashtagItems.map((item, idx) => (
            <HashtagRow
              key={item.tag}
              tag={item.tag}
              count={item.count}
              active={idx === hashtagHighlight}
              itemRef={idx === hashtagHighlight ? activeItemRef : null}
              onHover={() => onHashtagHighlight(idx)}
              onSelect={() => onHashtagSelect(item.tag)}
            />
          ))
        )}
      </ul>
    </div>
  );

  return createPortal(content, document.body);
}
