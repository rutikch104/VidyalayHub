import React, { useCallback, useEffect, useState } from 'react';
import superAdminService from '@/services/superAdminService';
import SuperAdminAddCollegeModal from '@/components/SuperAdminAddCollegeModal';
import SuperAdminCreateCollegeAdminModal from '@/components/SuperAdminCreateCollegeAdminModal';
import {
  Shield,
  Building,
  Users,
  GraduationCap,
  BarChart3,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Settings,
  Download,
  CheckCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Mail,
  MapPin,
  Crown,
  PieChart,
  LineChart,
  DollarSign,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  UserCheck,
  Ban,
  RefreshCw,
  Check,
  X,
  Trash2,
  UserPlus,
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
  const [creatingOwner, setCreatingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone_number: '',
  });
  const [showAddCollege, setShowAddCollege] = useState(false);
  const [showCreateCollegeAdmin, setShowCreateCollegeAdmin] = useState(false);
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

  const getStatusBadge = (status: string) => {
    const base = 'px-3 py-1 rounded-full text-xs font-medium border';
    if (status === 'Active') return `${base} bg-green-100 text-green-800 border-green-200`;
    if (status === 'Pending' || status === 'Trial') return `${base} bg-yellow-100 text-yellow-800 border-yellow-200`;
    if (status === 'Suspended' || status === 'Expired') return `${base} bg-red-100 text-red-800 border-red-200`;
    return `${base} bg-muted text-foreground border-border`;
  };

  const getPlanBadge = (plan: string) => {
    const base = 'px-3 py-1 rounded-full text-xs font-medium border';
    if (plan === 'Premium') return `${base} bg-blue-100 text-blue-800 border-blue-200`;
    if (plan === 'Enterprise') return `${base} bg-purple-100 text-purple-800 border-purple-200`;
    return `${base} bg-muted text-foreground border-border`;
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
      <div className="min-h-[calc(100vh-5rem)] w-full px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50/90 p-8 shadow-lg text-center">
          <Shield className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Super Admin · Access restricted</h1>
          <p className="text-foreground text-sm leading-relaxed">{accessDeniedMessage}</p>
        </div>
      </div>
    );
  }

  const filteredUsers = userListSearch.trim()
    ? allUsers.filter((u) => u.name?.toLowerCase().includes(userListSearch.toLowerCase()) || u.email?.toLowerCase().includes(userListSearch.toLowerCase()))
    : allUsers;

  const handleCreateOwner = async () => {
    setError('');
    if (!ownerForm.first_name.trim() || !ownerForm.email.trim() || !ownerForm.password) {
      setError('First name, email, and password are required to create super admin.');
      return;
    }
    try {
      setCreatingOwner(true);
      await superAdminService.createSuperAdminOwner({
        first_name: ownerForm.first_name.trim(),
        last_name: ownerForm.last_name.trim() || undefined,
        email: ownerForm.email.trim().toLowerCase(),
        password: ownerForm.password,
        phone_number: ownerForm.phone_number.trim() || undefined,
      });
      const owners = await superAdminService.getSuperAdminOwners();
      setOwnerList(owners || []);
      setOwnerForm({ first_name: '', last_name: '', email: '', password: '', phone_number: '' });
    } catch (e) {
      setError(getAxiosMessage(e) || (e instanceof Error ? e.message : 'Failed to create super admin'));
    } finally {
      setCreatingOwner(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="bg-card/90 backdrop-blur-sm border-b border-border/50 sticky top-16 z-40">
        <div className="platform-page__container mx-auto max-w-[1440px] px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg shrink-0">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Super Admin Portal
                </h1>
                <p className="text-muted-foreground mt-1">Manage all colleges and platform operations</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex shrink-0 items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-xl border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">System Healthy</span>
              </div>
              <button
                type="button"
                onClick={() => void handleExportColleges()}
                disabled={exporting}
                className="flex items-center space-x-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200 disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{exporting ? 'Exporting…' : 'Export Report'}</span>
              </button>
              <button className="p-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex space-x-6 sm:space-x-8 border-b border-border overflow-x-auto scrollbar-hide whitespace-nowrap pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-gradient-to-t from-blue-50/50 to-transparent'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="platform-page__container mx-auto max-w-[1440px] px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {loading && <div className="text-center text-muted-foreground py-4">Loading overview…</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-xl"><p className="text-blue-100 text-sm">Total Colleges</p><p className="text-3xl font-bold">{systemMetrics.totalColleges}</p></div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl"><p className="text-green-100 text-sm">Total Students</p><p className="text-3xl font-bold">{systemMetrics.totalStudents.toLocaleString()}</p></div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl"><p className="text-purple-100 text-sm">Total Teachers</p><p className="text-3xl font-bold">{systemMetrics.totalTeachers.toLocaleString()}</p></div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl"><p className="text-orange-100 text-sm">Active Users</p><p className="text-3xl font-bold">{systemMetrics.activeUsers.toLocaleString()}</p></div>
            </div>
            <div className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 p-6 shadow-lg">
              <h3 className="text-xl font-bold text-foreground mb-6">Recent Platform Activity</h3>
              <div className="space-y-3">
                {platformActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity to show.</p>
                ) : (
                  platformActivities.map((a) => (
                    <div key={a.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{a.message}</p>
                        {a.details ? <p className="text-xs text-muted-foreground truncate">{a.details}</p> : null}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'colleges' && (
          <div className="space-y-6">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {portalAdminSuccess ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{portalAdminSuccess}</div>
            ) : null}
            {(loading || collegesLoading) && <div className="text-center text-muted-foreground py-2">Loading colleges…</div>}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Colleges Management</h2>
                <p className="text-muted-foreground mt-1">Manage all tenant colleges and their subscriptions</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPortalAdminSuccess('');
                    setPortalAdminInitialCollegeId(null);
                    setShowCreateCollegeAdmin(true);
                  }}
                  className="border border-border bg-card text-foreground px-5 py-3 rounded-xl flex items-center space-x-2 hover:bg-muted/50"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Create college admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCollege(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:opacity-95"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add College</span>
                </button>
              </div>
            </div>
            <div className="bg-card/90 rounded-2xl border border-border/50 p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search colleges..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-border rounded-xl"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  {['All', 'Active', 'Inactive', 'Suspended', 'Trial'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        selectedFilter === filter ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-card text-muted-foreground border border-border'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {colleges.length === 0 && !collegesLoading ? (
                <p className="col-span-full text-center text-muted-foreground py-8">No colleges match this filter.</p>
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
                  <div key={college.id} className="bg-card/90 rounded-2xl border border-border/50 p-6 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-16 h-16 shrink-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
                          <Building className="h-8 w-8 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xl font-bold text-foreground truncate">{college.name}</h3>
                          <p className="text-muted-foreground">{college.type}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground truncate">{college.location || '—'}</span>
                          </div>
                          {adminEmail ? (
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={adminEmail}>
                              Contact: {adminEmail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className={getStatusBadge(college.status)}>{college.status}</span>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className={getPlanBadge(planLabel)}>{planLabel}</span>
                        <span className="text-lg font-bold text-foreground">{feeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expires: {expiryLabel}</span>
                        <span className={getStatusBadge(subStatus)}>{subStatus}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{(college.users?.students ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{college.users?.teachers ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Teachers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{college.users?.staff ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Staff</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {pendingLike ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleCollegeStatusChange(college.id, 'Active')}
                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleCollegeStatusChange(college.id, 'Inactive')}
                            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 border border-red-200 bg-red-50 text-red-800 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </>
                      ) : null}
                      {college.status === 'Active' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleCollegeStatusChange(college.id, 'Inactive')}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 border border-border bg-card py-2 rounded-lg text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
                        >
                          <Ban className="h-4 w-4" />
                          Deactivate
                        </button>
                      ) : null}
                      {(college.status === 'Inactive' || college.status === 'Suspended') && !pendingLike ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleCollegeStatusChange(college.id, 'Active')}
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                          {college.status === 'Suspended' ? 'Reactivate' : 'Approve again'}
                        </button>
                      ) : null}
                      {adminEmail ? (
                        <a
                          href={`mailto:${adminEmail}`}
                          className="p-2 text-muted-foreground hover:bg-muted rounded-lg border border-transparent hover:border-border"
                          title="Email admin"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="p-2 text-muted-foreground/40 rounded-lg" title="No admin email">
                          <Mail className="h-4 w-4" />
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeleteCollege(college.id, college.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 disabled:opacity-50"
                        title="Delete college"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setPortalAdminSuccess('');
                          setPortalAdminInitialCollegeId(college.id);
                          setShowCreateCollegeAdmin(true);
                        }}
                        className="w-full sm:w-auto sm:flex-1 min-w-[140px] inline-flex items-center justify-center gap-1 border border-indigo-200 bg-indigo-50 text-indigo-900 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50"
                        title="Create login for this college’s admin portal"
                      >
                        <UserPlus className="h-4 w-4" />
                        Create admin
                      </button>
                    </div>
                    {busy ? <p className="text-xs text-muted-foreground mt-2">Updating…</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white"><p className="text-blue-100 text-sm">Total users</p><p className="text-2xl font-bold">{userListTotal.toLocaleString()}</p></div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white"><p className="text-green-100 text-sm">Active</p><p className="text-2xl font-bold">{systemMetrics.activeUsers.toLocaleString()}</p></div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white"><p className="text-purple-100 text-sm">New this week</p><p className="text-2xl font-bold">{allUsers.filter((u) => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length}</p></div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white"><p className="text-orange-100 text-sm">Not approved</p><p className="text-2xl font-bold">{allUsers.filter((u) => u.status !== 'Active').length}</p></div>
            </div>
            <div className="bg-card/90 rounded-2xl border border-border/50 p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Super Admin Owners</h3>
                <span className="text-sm text-muted-foreground">{ownerList.length} total</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <input className="border border-border rounded-lg px-3 py-2" placeholder="First name*" value={ownerForm.first_name} onChange={(e) => setOwnerForm((p) => ({ ...p, first_name: e.target.value }))} />
                <input className="border border-border rounded-lg px-3 py-2" placeholder="Last name" value={ownerForm.last_name} onChange={(e) => setOwnerForm((p) => ({ ...p, last_name: e.target.value }))} />
                <input className="border border-border rounded-lg px-3 py-2" placeholder="Email*" type="email" value={ownerForm.email} onChange={(e) => setOwnerForm((p) => ({ ...p, email: e.target.value }))} />
                <input className="border border-border rounded-lg px-3 py-2" placeholder="Password*" type="password" value={ownerForm.password} onChange={(e) => setOwnerForm((p) => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => void handleCreateOwner()} disabled={creatingOwner} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg px-4 py-2 disabled:opacity-60">
                  {creatingOwner ? 'Creating…' : 'Create Super Admin'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ownerList.map((owner) => (
                      <tr key={owner.id}>
                        <td className="px-4 py-2">{[owner.first_name, owner.last_name].filter(Boolean).join(' ') || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{owner.email}</td>
                        <td className="px-4 py-2">
                          <span className={owner.access ? 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-800' : 'px-2 py-1 rounded-full text-xs bg-red-100 text-red-800'}>
                            {owner.access ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {ownerList.length === 0 ? (
                      <tr><td className="px-4 py-3 text-muted-foreground" colSpan={3}>No super admin owners found.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card/90 rounded-2xl border border-border/50 overflow-hidden shadow-lg">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Users</h3>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={userListSearch} onChange={(e) => setUserListSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-border rounded-lg" placeholder="Filter loaded users…" />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tenant</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.user_type}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.tenant_id?.slice?.(0, 8)}…</td>
                        <td className="px-4 py-3"><span className={u.status === 'Active' ? 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-800' : 'px-2 py-1 rounded-full text-xs bg-muted text-foreground'}>{u.status}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Subscription Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white"><p className="text-green-100 text-sm">Monthly Revenue</p><p className="text-3xl font-bold">₹{systemMetrics.revenue > 0 ? (systemMetrics.revenue / 100000).toFixed(1) : '0'}L</p></div>
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white"><p className="text-blue-100 text-sm">Active Subscriptions</p><p className="text-3xl font-bold">{colleges.filter((c) => c.subscription?.status === 'Active').length}</p></div>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white"><p className="text-orange-100 text-sm">Overdue Payments</p><p className="text-3xl font-bold">{colleges.filter((c) => c.subscription?.status === 'Expired').length}</p></div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">System Health & Monitoring</h2>
              <button className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Refresh Data</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card rounded-xl border border-border p-6"><Cpu className="h-6 w-6 mb-2 text-blue-600" /><p className="text-2xl font-bold">{health.serverLoad}%</p><p className="text-sm text-muted-foreground">CPU</p></div>
              <div className="bg-card rounded-xl border border-border p-6"><HardDrive className="h-6 w-6 mb-2 text-green-600" /><p className="text-2xl font-bold">{health.storageUsed}%</p><p className="text-sm text-muted-foreground">Storage</p></div>
              <div className="bg-card rounded-xl border border-border p-6"><Wifi className="h-6 w-6 mb-2 text-purple-600" /><p className="text-2xl font-bold">{health.uptime}%</p><p className="text-sm text-muted-foreground">Uptime</p></div>
              <div className="bg-card rounded-xl border border-border p-6"><Activity className="h-6 w-6 mb-2 text-orange-600" /><p className="text-2xl font-bold">{systemMetrics.activeUsers.toLocaleString()}</p><p className="text-sm text-muted-foreground">Active users</p></div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading && <div className="text-center text-muted-foreground py-4">Loading analytics…</div>}
            <h2 className="text-2xl font-bold text-foreground">Platform Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center"><LineChart className="h-5 w-5 mr-2 text-blue-600" />Users by role</h3>
                <ul className="space-y-2 text-sm">
                  {(platformAnalytics?.userGrowth?.labels || []).map((label: string, i: number) => (
                    <li key={`${label}-${i}`} className="flex justify-between border-b border-border pb-2">
                      <span className="capitalize">{label}</span>
                      <span className="font-semibold">{platformAnalytics?.userGrowth?.datasets?.[0]?.data?.[i] ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center"><PieChart className="h-5 w-5 mr-2 text-green-600" />Colleges by status</h3>
                <ul className="space-y-2 text-sm">
                  {(platformAnalytics?.collegeDistribution?.labels || []).map((label: string, i: number) => (
                    <li key={`${label}-${i}`} className="flex justify-between border-b border-border pb-2">
                      <span>{label}</span>
                      <span className="font-semibold">{platformAnalytics?.collegeDistribution?.datasets?.[0]?.data?.[i] ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
