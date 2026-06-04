import React, { useCallback, useEffect, useState } from 'react';
import superAdminService from '@/services/superAdminService';
import SuperAdminAddCollegeModal from '@/components/SuperAdminAddCollegeModal';
import SuperAdminCreateCollegeAdminModal from '@/components/SuperAdminCreateCollegeAdminModal';
import SuperAdminCreateSuperAdminModal from '@/components/SuperAdminCreateSuperAdminModal';
import {
  SuperAdminShell,
  SuperAdminContainer,
  SuperAdminHeader,
  SuperAdminStatusPill,
  SuperAdminButton,
  SuperAdminTabs,
  SuperAdminContent,
  SuperAdminKpiGrid,
  SuperAdminKpiCard,
  SuperAdminPanel,
  SuperAdminSectionHead,
  SuperAdminSearch,
  SuperAdminFilterChips,
  SuperAdminToolbar,
  SuperAdminBadge,
  SuperAdminAlert,
  SuperAdminTableWrap,
  SuperAdminEmpty,
  statusToBadgeVariant,
} from '@/components/superAdmin/SuperAdminUI';
import {
  Shield,
  Building,
  Users,
  BarChart3,
  Plus,
  Settings,
  Download,
  CheckCircle,
  Activity,
  Mail,
  MapPin,
  Crown,
  PieChart,
  LineChart,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  Ban,
  RefreshCw,
  Check,
  X,
  Trash2,
  UserPlus,
  UserCheck,
  TrendingUp,
} from 'lucide-react';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getAxiosStatus(e: unknown): number | undefined {
  if (!isRecord(e) || !('response' in e)) return undefined;
  const r = e.response;
  if (!isRecord(r) || typeof r.status !== 'number') return undefined;
  return r.status;
}

function getAxiosMessage(e: unknown): string | undefined {
  if (!isRecord(e) || !('response' in e)) return undefined;
  const r = e.response;
  if (!isRecord(r) || !('data' in r)) return undefined;
  const d = r.data;
  if (!isRecord(d) || typeof d.message !== 'string') return undefined;
  return d.message;
}

type College = {
  id: string;
  name: string;
  type: string;
  location: string;
  domain?: string;
  admin?: { name: string; email: string; phone?: string };
  users: { students: number; teachers: number; staff: number };
  subscription?: { plan: string; status: string; expiryDate: string; monthlyFee: number };
  status: string;
  storage?: { used: number; limit: number };
  features?: string[];
  lastActivity?: string;
  joined?: string;
};

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [platformActivities, setPlatformActivities] = useState<{ id: string; message: string; details?: string; timestamp: string }[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<any | null>(null);
  const [health, setHealth] = useState({ serverLoad: 0, storageUsed: 0, uptime: 99.9, db: 'unknown' });
  const [systemMetrics, setSystemMetrics] = useState({
    totalColleges: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeUsers: 0,
    revenue: 0,
    storageUsed: 0,
    serverLoad: 0,
    uptime: 99.9,
    growth: { colleges: 0, students: 0, revenue: 0 },
  });
  const [colleges, setColleges] = useState<College[]>([]);
  const [userListSearch, setUserListSearch] = useState('');
  const [userListTotal, setUserListTotal] = useState(0);
  const [ownerList, setOwnerList] = useState<any[]>([]);
  const [showAddCollege, setShowAddCollege] = useState(false);
  const [showCreateCollegeAdmin, setShowCreateCollegeAdmin] = useState(false);
  const [showCreateSuperAdmin, setShowCreateSuperAdmin] = useState(false);
  const [superAdminSuccess, setSuperAdminSuccess] = useState('');
  const [portalAdminInitialCollegeId, setPortalAdminInitialCollegeId] = useState<string | null>(null);
  const [portalAdminSuccess, setPortalAdminSuccess] = useState('');
  const [collegeBusyId, setCollegeBusyId] = useState<string | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'colleges', label: 'Colleges', icon: Building },
    { id: 'users', label: 'All Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
    { id: 'system', label: 'System Health', icon: Server },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
  ];

  const formatOwnerName = (owner: { first_name?: string; last_name?: string }) => {
    const raw = [owner.first_name, owner.last_name].filter(Boolean).join(' ');
    return raw || '—';
  };

  const handleExportColleges = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await superAdminService.exportData('colleges', 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `super-colleges-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const fetchCollegesList = useCallback(async () => {
    setCollegesLoading(true);
    setError('');
    try {
      const cols = await superAdminService.getColleges({
        limit: 100,
        page: 1,
        search: searchTerm || undefined,
        status: selectedFilter !== 'All' ? selectedFilter : undefined,
      });
      setColleges((cols.colleges || []) as College[]);
    } catch (e: unknown) {
      setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to load colleges'));
    } finally {
      setCollegesLoading(false);
    }
  }, [searchTerm, selectedFilter]);

  const handleCollegeStatusChange = async (collegeId: string, status: 'Active' | 'Inactive' | 'Suspended') => {
    setCollegeBusyId(collegeId);
    setError('');
    try {
      await superAdminService.toggleCollegeStatus(collegeId, status);
      await fetchCollegesList();
      const m = await superAdminService.getSystemMetrics();
      setSystemMetrics((prev) => ({ ...prev, ...m }));
    } catch (e: unknown) {
      setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to update college'));
    } finally {
      setCollegeBusyId(null);
    }
  };

  const handleDeleteCollege = async (collegeId: string, name: string) => {
    if (!window.confirm(`Delete college “${name}”? This cannot be undone if the tenant has no blocking references.`)) {
      return;
    }
    setCollegeBusyId(collegeId);
    setError('');
    try {
      await superAdminService.deleteCollege(collegeId);
      await fetchCollegesList();
      const m = await superAdminService.getSystemMetrics();
      setSystemMetrics((prev) => ({ ...prev, ...m }));
    } catch (e: unknown) {
      setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to delete college'));
    } finally {
      setCollegeBusyId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const m = await superAdminService.getSystemMetrics();
        if (!cancelled) {
          setAccessDenied(false);
          setAccessDeniedMessage('');
          setSystemMetrics((prev) => ({ ...prev, ...m }));
        }
        if (activeTab === 'overview') {
          const act = await superAdminService.getRecentActivities({ limit: 12 });
          if (!cancelled) setPlatformActivities(act);
        }
        if (activeTab === 'users') {
          const u = await superAdminService.getUsers({ limit: 200 });
          const owners = await superAdminService.getSuperAdminOwners();
          if (!cancelled) {
            setAllUsers(u.users || []);
            setUserListTotal(u.total || 0);
            setOwnerList(owners || []);
          }
        }
        if (activeTab === 'system') {
          const h = await superAdminService.getSystemHealth();
          if (!cancelled && h) {
            setHealth({
              db: h.db ?? 'unknown',
              serverLoad: Number(h.serverLoad) || 0,
              storageUsed: Number(h.storageUsed) || 0,
              uptime: Number(h.uptime) || 99.9,
            });
          }
        }
      } catch (e) {
        if (getAxiosStatus(e) === 403) {
          if (!cancelled) {
            setAccessDenied(true);
            setAccessDeniedMessage(
              getAxiosMessage(e) ||
                'Super admin access denied. Configure SUPER_ADMIN_EMAILS, a super_admins owner account, or SUPER_ADMIN_OPEN=true for development.'
            );
          }
        } else if (!cancelled) {
          setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to load data'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      setError('');
      try {
        const a = await superAdminService.getAnalytics();
        if (!cancelled) setPlatformAnalytics(a);
      } catch (e) {
        if (!cancelled) setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to load analytics'));
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!['colleges', 'subscriptions'].includes(activeTab)) return;
    void fetchCollegesList();
  }, [activeTab, fetchCollegesList]);

  if (accessDenied) {
    return (
      <SuperAdminShell>
        <SuperAdminContainer>
          <div className="flex min-h-[60vh] items-center justify-center">
            <SuperAdminPanel title="Super Admin · Access restricted" subtitle={accessDeniedMessage}>
              <div className="flex flex-col items-center py-6 text-center">
                <div className="sa-portal__header-icon mb-4" style={{ background: 'linear-gradient(135deg, hsl(32 90% 44%) 0%, hsl(45 85% 48%) 100%)' }}>
                  <Shield className="h-6 w-6" />
                </div>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{accessDeniedMessage}</p>
              </div>
            </SuperAdminPanel>
          </div>
        </SuperAdminContainer>
      </SuperAdminShell>
    );
  }

  const filteredUsers = userListSearch.trim()
    ? allUsers.filter((u) => u.name?.toLowerCase().includes(userListSearch.toLowerCase()) || u.email?.toLowerCase().includes(userListSearch.toLowerCase()))
    : allUsers;

  return (
    <SuperAdminShell>
      <SuperAdminContainer>
        <SuperAdminHeader
          title="Super Admin Portal"
          subtitle="Manage all colleges and platform operations"
          actions={
            <>
              <SuperAdminStatusPill />
              <SuperAdminButton onClick={() => void handleExportColleges()} disabled={exporting}>
                <Download className="h-4 w-4" />
                <span>{exporting ? 'Exporting…' : 'Export Report'}</span>
              </SuperAdminButton>
              <SuperAdminButton variant="ghost" title="Settings">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </SuperAdminButton>
            </>
          }
        />

        <SuperAdminTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <SuperAdminContent>
          {activeTab === 'overview' && (
            <>
              {error ? <SuperAdminAlert variant="error">{error}</SuperAdminAlert> : null}
              {loading ? <SuperAdminAlert variant="loading">Loading overview…</SuperAdminAlert> : null}
              <SuperAdminKpiGrid>
                <SuperAdminKpiCard label="Total Colleges" value={systemMetrics.totalColleges} icon={Building} tone="indigo" />
                <SuperAdminKpiCard label="Total Students" value={systemMetrics.totalStudents.toLocaleString()} icon={Users} tone="emerald" />
                <SuperAdminKpiCard label="Total Teachers" value={systemMetrics.totalTeachers.toLocaleString()} icon={UserCheck} tone="violet" />
                <SuperAdminKpiCard label="Active Users" value={systemMetrics.activeUsers.toLocaleString()} icon={Activity} tone="amber" />
              </SuperAdminKpiGrid>
              <SuperAdminPanel title="Recent Platform Activity" subtitle="Latest events across all tenants">
                <div className="sa-activity-list">
                  {platformActivities.length === 0 ? (
                    <SuperAdminEmpty>No activity to show.</SuperAdminEmpty>
                  ) : (
                    platformActivities.map((a) => (
                      <div key={a.id} className="sa-activity-item">
                        <CheckCircle className="sa-activity-item__icon h-4 w-4" aria-hidden />
                        <div className="sa-activity-item__text">
                          <p className="sa-activity-item__title">{a.message}</p>
                          {a.details ? <p className="sa-activity-item__meta">{a.details}</p> : null}
                        </div>
                        <span className="sa-activity-item__time">{new Date(a.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </SuperAdminPanel>
            </>
          )}

        {activeTab === 'colleges' && (
            <>
              {error ? <SuperAdminAlert variant="error">{error}</SuperAdminAlert> : null}
              {portalAdminSuccess ? <SuperAdminAlert variant="success">{portalAdminSuccess}</SuperAdminAlert> : null}
              {(loading || collegesLoading) ? <SuperAdminAlert variant="loading">Loading colleges…</SuperAdminAlert> : null}

              <SuperAdminSectionHead
                title="Colleges Management"
                description="Manage all tenant colleges and their subscriptions"
                actions={
                  <div className="flex flex-wrap gap-2">
                    <SuperAdminButton
                      onClick={() => {
                        setPortalAdminSuccess('');
                        setPortalAdminInitialCollegeId(null);
                        setShowCreateCollegeAdmin(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Create college admin</span>
                    </SuperAdminButton>
                    <SuperAdminButton variant="success" onClick={() => setShowAddCollege(true)}>
                      <Plus className="h-4 w-4" />
                      <span>Add College</span>
                    </SuperAdminButton>
                  </div>
                }
              />

              <SuperAdminPanel flush>
                <div className="sa-panel__body">
                  <SuperAdminToolbar>
                    <SuperAdminSearch value={searchTerm} onChange={setSearchTerm} placeholder="Search colleges…" />
                    <SuperAdminFilterChips
                      options={['All', 'Active', 'Inactive', 'Suspended', 'Trial']}
                      value={selectedFilter}
                      onChange={setSelectedFilter}
                    />
                  </SuperAdminToolbar>
                </div>
              </SuperAdminPanel>

              <div className="sa-college-grid">
                {colleges.length === 0 && !collegesLoading ? (
                  <SuperAdminEmpty>No colleges match this filter.</SuperAdminEmpty>
                ) : null}
              {colleges.map((college) => {
                const busy = collegeBusyId === college.id;
                const sub = college.subscription;
                const monthlyFee = sub?.monthlyFee;
                const feeLabel =
                  monthlyFee != null && monthlyFee > 0 ? `₹${(monthlyFee / 1000).toFixed(0)}K/mo` : '—';
                const planLabel = sub?.plan ?? 'Basic';
                const expiryLabel = sub?.expiryDate || '—';
                const subStatus = sub?.status ?? '—';
                const pendingLike = college.status === 'Pending' || college.status === 'Trial';
                const adminEmail = college.admin?.email;

                return (
                  <article key={college.id} className="sa-college-card">
                    <div className="sa-college-card__head">
                      <div className="sa-college-card__brand">
                        <div className="sa-college-card__logo" aria-hidden>
                          <Building className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="sa-college-card__name">{college.name}</h3>
                          <p className="text-sm text-muted-foreground">{college.type}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{college.location || '—'}</span>
                          </div>
                          {adminEmail ? (
                            <p className="mt-1 truncate text-xs text-muted-foreground" title={adminEmail}>
                              Contact: {adminEmail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <SuperAdminBadge variant={statusToBadgeVariant(college.status)}>{college.status}</SuperAdminBadge>
                    </div>
                    <div className="sa-college-card__subplan">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <SuperAdminBadge variant="plan">{planLabel}</SuperAdminBadge>
                        <span className="text-base font-bold">{feeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires: {expiryLabel}</span>
                        <SuperAdminBadge variant={statusToBadgeVariant(subStatus)}>{subStatus}</SuperAdminBadge>
                      </div>
                    </div>
                    <div className="sa-college-card__stats">
                      <div className="sa-college-card__stat">
                        <p className="sa-college-card__stat-value text-[hsl(239_58%_52%)]">{(college.users?.students ?? 0).toLocaleString()}</p>
                        <p className="sa-college-card__stat-label">Students</p>
                      </div>
                      <div className="sa-college-card__stat">
                        <p className="sa-college-card__stat-value text-[hsl(152_55%_38%)]">{college.users?.teachers ?? 0}</p>
                        <p className="sa-college-card__stat-label">Teachers</p>
                      </div>
                      <div className="sa-college-card__stat">
                        <p className="sa-college-card__stat-value text-[hsl(262_55%_52%)]">{college.users?.staff ?? 0}</p>
                        <p className="sa-college-card__stat-label">Staff</p>
                      </div>
                    </div>
                    <div className="sa-college-card__actions">
                      {pendingLike ? (
                        <>
                          <SuperAdminButton variant="success" disabled={busy} onClick={() => void handleCollegeStatusChange(college.id, 'Active')}>
                            <Check className="h-4 w-4" />
                            Approve
                          </SuperAdminButton>
                          <SuperAdminButton disabled={busy} onClick={() => void handleCollegeStatusChange(college.id, 'Inactive')}>
                            <X className="h-4 w-4" />
                            Reject
                          </SuperAdminButton>
                        </>
                      ) : null}
                      {college.status === 'Active' ? (
                        <SuperAdminButton disabled={busy} onClick={() => void handleCollegeStatusChange(college.id, 'Inactive')}>
                          <Ban className="h-4 w-4" />
                          Deactivate
                        </SuperAdminButton>
                      ) : null}
                      {(college.status === 'Inactive' || college.status === 'Suspended') && !pendingLike ? (
                        <SuperAdminButton variant="primary" disabled={busy} onClick={() => void handleCollegeStatusChange(college.id, 'Active')}>
                          <Check className="h-4 w-4" />
                          {college.status === 'Suspended' ? 'Reactivate' : 'Approve again'}
                        </SuperAdminButton>
                      ) : null}
                      {adminEmail ? (
                        <SuperAdminButton variant="ghost" title="Email admin" className="!min-w-0 !flex-none">
                          <a href={`mailto:${adminEmail}`} className="inline-flex">
                            <Mail className="h-4 w-4" />
                          </a>
                        </SuperAdminButton>
                      ) : (
                        <SuperAdminButton variant="ghost" disabled title="No admin email" className="!min-w-0 !flex-none">
                          <Mail className="h-4 w-4 opacity-40" />
                        </SuperAdminButton>
                      )}
                      <SuperAdminButton
                        variant="ghost"
                        disabled={busy}
                        title="Delete college"
                        className="!min-w-0 !flex-none text-red-600 hover:bg-red-50"
                        onClick={() => void handleDeleteCollege(college.id, college.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </SuperAdminButton>
                      <SuperAdminButton
                        disabled={busy}
                        onClick={() => {
                          setPortalAdminSuccess('');
                          setPortalAdminInitialCollegeId(college.id);
                          setShowCreateCollegeAdmin(true);
                        }}
                        title="Create login for this college admin portal"
                      >
                        <UserPlus className="h-4 w-4" />
                        Create admin
                      </SuperAdminButton>
                    </div>
                    {busy ? <p className="mt-2 text-xs text-muted-foreground">Updating…</p> : null}
                  </article>
                );
              })}
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <>
              {error ? <SuperAdminAlert variant="error">{error}</SuperAdminAlert> : null}
              <SuperAdminKpiGrid>
                <SuperAdminKpiCard label="Total users" value={userListTotal.toLocaleString()} icon={Users} tone="indigo" />
                <SuperAdminKpiCard label="Active" value={systemMetrics.activeUsers.toLocaleString()} icon={UserCheck} tone="emerald" />
                <SuperAdminKpiCard
                  label="New this week"
                  value={allUsers.filter((u) => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length}
                  icon={TrendingUp}
                  tone="violet"
                />
                <SuperAdminKpiCard
                  label="Not approved"
                  value={allUsers.filter((u) => u.status !== 'Active').length}
                  icon={Ban}
                  tone="amber"
                />
              </SuperAdminKpiGrid>

              <SuperAdminPanel
                title="Super Admin Owners"
                subtitle="Owner-level accounts that bypass tenant scoping."
                headerExtra={
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-muted-foreground">{ownerList.length} total</span>
                    <SuperAdminButton
                      variant="primary"
                      onClick={() => {
                        setSuperAdminSuccess('');
                        setError('');
                        setShowCreateSuperAdmin(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4" />
                      Create super admin
                    </SuperAdminButton>
                  </div>
                }
                flush
              >
                {superAdminSuccess ? (
                  <div className="sa-panel__body pb-0">
                    <SuperAdminAlert variant="success">{superAdminSuccess}</SuperAdminAlert>
                  </div>
                ) : null}
                <SuperAdminTableWrap>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Access</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ownerList.map((owner) => (
                        <tr key={owner.id}>
                          <td className="font-medium">{formatOwnerName(owner)}</td>
                          <td className="sa-table__cell-muted">{owner.email}</td>
                          <td className="sa-table__cell-muted">{owner.phone_number || '—'}</td>
                          <td>
                            <SuperAdminBadge variant={owner.access ? 'success' : 'danger'}>
                              {owner.access ? 'Active' : 'Disabled'}
                            </SuperAdminBadge>
                          </td>
                          <td className="sa-table__cell-muted">
                            {owner.created_at ? new Date(owner.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                      {ownerList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="sa-table__cell-muted">
                            No super admin owners found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </SuperAdminTableWrap>
              </SuperAdminPanel>

              <SuperAdminPanel
                title="Users"
                headerExtra={
                  <SuperAdminSearch
                    value={userListSearch}
                    onChange={setUserListSearch}
                    placeholder="Filter loaded users…"
                    className="max-w-md"
                  />
                }
                headerStack
                flush
              >
                <SuperAdminTableWrap>
                  <table className="sa-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>Tenant</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="sa-table__cell-muted">
                            No users match your filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id}>
                            <td className="font-medium">{u.name}</td>
                            <td className="sa-table__cell-muted">{u.email}</td>
                            <td className="sa-table__cell-muted capitalize">{u.user_type}</td>
                            <td className="sa-table__cell-muted sa-table__cell-mono" title={u.tenant_id}>
                              {u.tenant_id?.slice?.(0, 8)}…
                            </td>
                            <td>
                              <SuperAdminBadge variant={statusToBadgeVariant(u.status)}>{u.status}</SuperAdminBadge>
                            </td>
                            <td className="sa-table__cell-muted">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </SuperAdminTableWrap>
              </SuperAdminPanel>
            </>
          )}

          {activeTab === 'subscriptions' && (
            <>
              <SuperAdminSectionHead title="Subscription Management" description="Revenue and billing across all tenants" />
              <SuperAdminKpiGrid cols={3}>
                <SuperAdminKpiCard
                  label="Monthly Revenue"
                  value={`₹${systemMetrics.revenue > 0 ? (systemMetrics.revenue / 100000).toFixed(1) : '0'}L`}
                  icon={Crown}
                  tone="emerald"
                />
                <SuperAdminKpiCard
                  label="Active Subscriptions"
                  value={colleges.filter((c) => c.subscription?.status === 'Active').length}
                  icon={CheckCircle}
                  tone="indigo"
                />
                <SuperAdminKpiCard
                  label="Overdue Payments"
                  value={colleges.filter((c) => c.subscription?.status === 'Expired').length}
                  icon={Ban}
                  tone="rose"
                />
              </SuperAdminKpiGrid>
            </>
          )}

          {activeTab === 'system' && (
            <>
              <SuperAdminSectionHead
                title="System Health & Monitoring"
                description="Infrastructure metrics and platform uptime"
                actions={
                  <SuperAdminButton variant="primary">
                    <RefreshCw className="h-4 w-4" />
                    Refresh Data
                  </SuperAdminButton>
                }
              />
              <SuperAdminKpiGrid>
                <SuperAdminKpiCard label="CPU Load" value={`${health.serverLoad}%`} icon={Cpu} tone="indigo" />
                <SuperAdminKpiCard label="Storage Used" value={`${health.storageUsed}%`} icon={HardDrive} tone="emerald" />
                <SuperAdminKpiCard label="Uptime" value={`${health.uptime}%`} icon={Wifi} tone="violet" />
                <SuperAdminKpiCard label="Active Users" value={systemMetrics.activeUsers.toLocaleString()} icon={Activity} tone="amber" />
              </SuperAdminKpiGrid>
              <SuperAdminPanel title="Database" subtitle={`Connection status: ${health.db}`}>
                <p className="text-sm text-muted-foreground">
                  Monitor server load, storage, and uptime from this dashboard. Use refresh to pull the latest health snapshot.
                </p>
              </SuperAdminPanel>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              {analyticsLoading ? <SuperAdminAlert variant="loading">Loading analytics…</SuperAdminAlert> : null}
              <SuperAdminSectionHead title="Platform Analytics" description="User distribution and college status breakdown" />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SuperAdminPanel
                  title="Users by role"
                  headerExtra={<LineChart className="h-5 w-5 text-[hsl(239_58%_52%)]" aria-hidden />}
                >
                  <div className="sa-stat-list">
                    {(platformAnalytics?.userGrowth?.labels || []).length === 0 ? (
                      <SuperAdminEmpty>No user role data available.</SuperAdminEmpty>
                    ) : (
                      (platformAnalytics?.userGrowth?.labels || []).map((label: string, i: number) => (
                        <div key={`${label}-${i}`} className="sa-stat-list__row">
                          <span className="capitalize">{label}</span>
                          <span className="sa-stat-list__value">
                            {platformAnalytics?.userGrowth?.datasets?.[0]?.data?.[i] ?? '—'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </SuperAdminPanel>
                <SuperAdminPanel
                  title="Colleges by status"
                  headerExtra={<PieChart className="h-5 w-5 text-[hsl(152_55%_38%)]" aria-hidden />}
                >
                  <div className="sa-stat-list">
                    {(platformAnalytics?.collegeDistribution?.labels || []).length === 0 ? (
                      <SuperAdminEmpty>No college distribution data available.</SuperAdminEmpty>
                    ) : (
                      (platformAnalytics?.collegeDistribution?.labels || []).map((label: string, i: number) => (
                        <div key={`${label}-${i}`} className="sa-stat-list__row">
                          <span>{label}</span>
                          <span className="sa-stat-list__value">
                            {platformAnalytics?.collegeDistribution?.datasets?.[0]?.data?.[i] ?? '—'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </SuperAdminPanel>
              </div>
            </>
          )}
        </SuperAdminContent>
      </SuperAdminContainer>

      <SuperAdminAddCollegeModal
        open={showAddCollege}
        onClose={() => setShowAddCollege(false)}
        onSuccess={() => {
          void fetchCollegesList();
          void superAdminService.getSystemMetrics().then((m) => setSystemMetrics((prev) => ({ ...prev, ...m })));
        }}
        onError={(msg: string) => setError(msg || '')}
      />

      <SuperAdminCreateCollegeAdminModal
        open={showCreateCollegeAdmin}
        onClose={() => {
          setShowCreateCollegeAdmin(false);
          setPortalAdminInitialCollegeId(null);
        }}
        initialCollegeId={portalAdminInitialCollegeId || undefined}
        onSuccess={() => {
          setError('');
          setPortalAdminSuccess(
            'College admin created. They can sign in on the main login page with the email and password you entered, then open Admin.',
          );
          void fetchCollegesList();
          void superAdminService.getSystemMetrics().then((m) => setSystemMetrics((prev) => ({ ...prev, ...m })));
        }}
        onError={(msg: string) => setError(msg || '')}
      />

      <SuperAdminCreateSuperAdminModal
        open={showCreateSuperAdmin}
        onClose={() => setShowCreateSuperAdmin(false)}
        onSuccess={(createdEmail: string) => {
          setError('');
          setSuperAdminSuccess(`Super admin created for ${createdEmail}. They can sign in at /super-admin-login.`);
          void superAdminService
            .getSuperAdminOwners()
            .then((owners) => setOwnerList(owners || []))
            .catch(() => undefined);
        }}
        onError={(msg: string) => setError(msg || '')}
      />
    </SuperAdminShell>
  );
}
