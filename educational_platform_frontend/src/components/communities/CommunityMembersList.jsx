// @ts-nocheck
import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Crown, Shield, User, MoreHorizontal, UserMinus, ArrowUpRight, Loader2 } from 'lucide-react';
import communitiesService from '@/services/communitiesService';
import { useProfileNavigationOptional } from '@/contexts/ProfileNavigationContext';
import { avatarOrFallback, canModerateCommunity, canAdminCommunity } from './communityUtils';
import AcademicIdentityLine from '@/components/user/AcademicIdentityLine';
import { MemberRowSkeleton } from './CommunitySkeleton';

const ROLE_OPTIONS = [
  { id: 'all',       label: 'All' },
  { id: 'admin',     label: 'Admins' },
  { id: 'moderator', label: 'Moderators' },
  { id: 'member',    label: 'Members' },
];

const ROLE_ICON = {
  admin:     Crown,
  moderator: Shield,
  member:    User,
};

const ROLE_STYLES = {
  admin:     'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  moderator: 'bg-primary/10 text-primary border-primary/20',
  member:    'bg-muted text-muted-foreground border-border/60',
};

export default function CommunityMembersList({ community, onChange }) {
  const profileNav = useProfileNavigationOptional();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actingId, setActingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  const isAdmin = canAdminCommunity(community);
  const isMod = canModerateCommunity(community);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await communitiesService.getCommunityMembers(community.id, {
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: debouncedSearch || undefined,
        limit: 100,
        page: 1,
      });
      setMembers(res.members || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [community.id, roleFilter, debouncedSearch]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!menuOpenId) return undefined;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpenId]);

  const handlePromote = async (m, newRole) => {
    setActingId(m.user_id || m.id);
    try {
      await communitiesService.updateMemberRole(community.id, m.user_id || m.id, newRole);
      setMembers((prev) => prev.map((x) => ((x.user_id || x.id) === (m.user_id || m.id) ? { ...x, role: newRole } : x)));
      setMenuOpenId(null);
      onChange?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not update role');
    } finally {
      setActingId(null);
    }
  };

  const handleRemove = async (m) => {
    setActingId(m.user_id || m.id);
    try {
      await communitiesService.removeMember(community.id, m.user_id || m.id);
      setMembers((prev) => prev.filter((x) => (x.user_id || x.id) !== (m.user_id || m.id)));
      setMenuOpenId(null);
      onChange?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not remove member');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full rounded-xl border border-border/60 bg-card/80 py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border/60 bg-muted/30 p-0.5">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRoleFilter(opt.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === opt.id
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* List */}
      {loading ? (
        <div className="space-y-1.5">
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
          No members match your filters.
        </div>
      ) : (
        <ul className="space-y-1">
          {members.map((m) => {
            const id = m.user_id || m.id;
            const role = m.role || 'member';
            const RoleIcon = ROLE_ICON[role] || User;
            const name = m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member';
            const showMenu = menuOpenId === id;
            const canManage = isAdmin && role !== 'admin';

            return (
              <li key={id} className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => profileNav?.openProfile?.(id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <img
                    src={avatarOrFallback(m)}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <AcademicIdentityLine
                      user={m}
                      className="academic-identity-line--compact comm-member-identity line-clamp-2"
                    />
                  </div>
                </button>

                <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_STYLES[role]}`}>
                  <RoleIcon className="h-3 w-3" />
                  {role}
                </span>

                {canManage && (
                  <div className="relative" ref={showMenu ? menuRef : null}>
                    <button
                      type="button"
                      onClick={() => setMenuOpenId(showMenu ? null : id)}
                      disabled={actingId === id}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Member actions"
                    >
                      {actingId === id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <MoreHorizontal className="h-4 w-4" />}
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-border/60 bg-card py-1 shadow-lg ring-1 ring-black/[0.04]">
                        {role !== 'moderator' && (
                          <button
                            type="button"
                            onClick={() => handlePromote(m, 'moderator')}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
                          >
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            Make moderator
                          </button>
                        )}
                        {role === 'moderator' && (
                          <button
                            type="button"
                            onClick={() => handlePromote(m, 'member')}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
                          >
                            <ArrowUpRight className="h-4 w-4 rotate-180 text-muted-foreground" />
                            Demote to member
                          </button>
                        )}
                        <div className="my-1 border-t border-border/60" />
                        <button
                          type="button"
                          onClick={() => handleRemove(m)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
                        >
                          <UserMinus className="h-4 w-4" />
                          Remove from community
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
