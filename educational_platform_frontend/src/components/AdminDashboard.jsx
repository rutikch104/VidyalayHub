import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, GraduationCap, BarChart3, Search, Plus, Filter, MoreHorizontal, Eye, Edit, Trash2, Mail, Building, Settings, Download, CheckCircle, Clock, AlertCircle, Shield, PieChart, Activity, Loader2, Megaphone, ImagePlus, Briefcase } from 'lucide-react';
import adminService from '@/services/adminService';
import AdminStudentsTab from '@/components/AdminStudentsTab';
import AdminTeachersTab from '@/components/AdminTeachersTab';
import AdminAlumniTab from '@/components/AdminAlumniTab';
import AdminOverviewTab from '@/components/AdminOverviewTab';
import AdminNoticesTab from '@/components/AdminNoticesTab';
import AdminCollegeProfileTab from '@/components/AdminCollegeProfileTab';
import PlatformTabs from '@/components/ui/PlatformTabs';
import { useAuth } from '@/contexts/AuthContext';
import { isCollegeScopedAdmin } from '@/lib/access';
const AdminDashboard = ({ portalAccess: portalAccessProp, onNavigate, onAccessDenied }) => {
    const { user } = useAuth();
    const isCollegeScoped =
        portalAccessProp === 'college' ||
        (portalAccessProp == null && isCollegeScopedAdmin(user));
    const institutionLabel = String(user?.tenant_name || '').trim();
    const portalTitle = isCollegeScoped ? (institutionLabel || 'Institution administration') : 'Platform administration';
    const portalSubtitle = isCollegeScoped
        ? 'Manage students, teachers, and registrations for your college.'
        : 'Manage colleges, students, and faculty across the platform';
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // Data states
    const [stats, setStats] = useState(null);
    const [colleges, setColleges] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [analyticsSummary, setAnalyticsSummary] = useState(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showAddCollege, setShowAddCollege] = useState(false);
    const [createCollegeSaving, setCreateCollegeSaving] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        type: 'University',
        location: '',
        domain: '',
        admin_email: '',
        admin_name: '',
    });
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
        return () => clearTimeout(t);
    }, [searchTerm]);
    const searchParam = useMemo(() => (debouncedSearch || undefined), [debouncedSearch]);
    const statusParam = useMemo(() => (selectedFilter !== 'All' ? selectedFilter : undefined), [selectedFilter]);
    useEffect(() => {
        if (isCollegeScoped && activeTab === 'colleges')
            setActiveTab('overview');
    }, [isCollegeScoped, activeTab]);
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                switch (activeTab) {
                    case 'overview': {
                        const [statsData, activityData] = await Promise.all([
                            adminService.getAdminStats(),
                            adminService.getRecentActivity({ limit: 8 }),
                        ]);
                        setStats(statsData);
                        setRecentActivity(activityData);
                        break;
                    }
                    case 'colleges': {
                        const collegesData = await adminService.getColleges({
                            search: searchParam,
                            status: statusParam,
                            limit: 50,
                        });
                        setColleges(collegesData.colleges);
                        break;
                    }
                    case 'analytics': {
                        const data = await adminService.getAnalytics();
                        setAnalyticsSummary(data?.summary || null);
                        break;
                    }
                }
            }
            catch (err) {
                const ax = err;
                if (ax.response?.status === 403 && typeof onAccessDenied === 'function') {
                    onAccessDenied();
                    return;
                }
                setError(ax.response?.data?.message || ax.message || 'Failed to fetch data');
            }
            finally {
                setLoading(false);
            }
        };
        void fetchData();
    }, [activeTab, searchParam, statusParam]);
    const handleDeleteCollege = async (id) => {
        if (!window.confirm('Delete this college? This may fail if users are still assigned to it.'))
            return;
        try {
            await adminService.deleteCollege(id);
            setColleges((prev) => prev.filter((c) => c.id !== id));
        }
        catch (err) {
            const ax = err;
            setError(ax.response?.data?.message || ax.message || 'Delete failed');
        }
    };
    const handleExport = async (kind) => {
        try {
            const blob = await adminService.exportData(kind, 'csv');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${kind}-export.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            const ax = err;
            setError(ax.message || 'Export failed');
        }
    };
    const submitCreateCollege = async (e) => {
        e.preventDefault();
        if (!createForm.name.trim()) {
            setError('College name is required.');
            return;
        }
        setCreateCollegeSaving(true);
        setError('');
        try {
            const created = await adminService.createCollege({
                ...createForm,
                name: createForm.name.trim(),
                type: createForm.type || 'University',
                location: createForm.location.trim(),
                domain: createForm.domain.trim(),
                admin_email: createForm.admin_email.trim(),
                admin_name: createForm.admin_name.trim(),
            });
            setColleges((prev) => [created, ...prev]);
            setShowAddCollege(false);
            setCreateForm({
                name: '',
                type: 'University',
                location: '',
                domain: '',
                admin_email: '',
                admin_name: '',
            });
        }
        catch (err) {
            const ax = err;
            setError(ax.response?.data?.message || ax.message || 'Create failed');
        }
        finally {
            setCreateCollegeSaving(false);
        }
    };
    const tabs = useMemo(() => {
        const all = [
            { id: 'overview', label: 'Overview', icon: BarChart3, color: 'from-blue-500 to-cyan-500' },
            { id: 'colleges', label: 'Colleges', icon: Building, color: 'from-green-500 to-emerald-500' },
            { id: 'college-profile', label: 'College profile', icon: ImagePlus, color: 'from-indigo-500 to-violet-500' },
            { id: 'notices', label: 'Notice board', icon: Megaphone, color: 'from-amber-500 to-yellow-500' },
            { id: 'students', label: 'Students', icon: GraduationCap, color: 'from-purple-500 to-pink-500' },
            { id: 'teachers', label: 'Teachers', icon: Users, color: 'from-orange-500 to-red-500' },
            { id: 'alumni', label: 'Alumni', icon: Briefcase, color: 'from-violet-500 to-purple-500' },
            { id: 'analytics', label: 'Analytics', icon: PieChart, color: 'from-indigo-500 to-blue-500' },
        ];
        // College Profile is the tenant-scoped settings page — only college admins see it.
        // Platform-wide super admins manage all colleges via the existing "Colleges" tab.
        if (isCollegeScoped) return all.filter((t) => t.id !== 'colleges');
        return all.filter((t) => t.id !== 'college-profile');
    }, [isCollegeScoped]);
    const refreshOverviewStats = useCallback(async () => {
        try {
            const [statsData, activityData] = await Promise.all([
                adminService.getAdminStats(),
                adminService.getRecentActivity({ limit: 8 }),
            ]);
            setStats(statsData);
            setRecentActivity(activityData);
        }
        catch {
            /* ignore when overview is not mounted */
        }
    }, []);
    const getStatusBadge = (status) => {
        const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';
        switch (status) {
            case 'Active':
                return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
            case 'Pending':
                return `${baseClasses} bg-amber-100 text-amber-900 border border-amber-200`;
            case 'Inactive':
                return `${baseClasses} bg-muted text-foreground border border-border`;
            case 'Probation':
                return `${baseClasses} bg-orange-100 text-orange-800 border border-orange-200`;
            case 'Suspended':
                return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
            case 'Sabbatical':
                return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
            default:
                return baseClasses;
        }
    };
    const renderOverview = () => _jsx(AdminOverviewTab, {
        loading,
        error,
        stats,
        recentActivity,
        isCollegeScoped,
        institutionName: institutionLabel,
        institutionType: String(user?.tenant_type || ''),
        onReviewStudents: () => setActiveTab('students'),
        onReviewTeachers: () => setActiveTab('teachers'),
        onUsersMutated: refreshOverviewStats,
    });
    const renderColleges = () => (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-foreground", children: "Colleges Management" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "Manage all registered educational institutions" })] }), _jsxs("button", { type: "button", onClick: () => setShowAddCollege(true), className: "bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg flex items-center space-x-2", children: [_jsx(Plus, { className: "h-5 w-5" }), _jsx("span", { children: "Add College" })] })] }), _jsx("div", { className: "premium-surface p-6", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-4 items-center", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { className: "absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" }), _jsx("input", { type: "text", placeholder: "Search colleges...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "platform-search pl-12" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("button", { className: "flex items-center px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors", children: [_jsx(Filter, { className: "h-4 w-4 mr-2" }), "Filter"] }), _jsxs("button", { type: "button", onClick: () => handleExport('colleges'), className: "flex items-center px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors", children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "Export"] })] })] }) }), _jsx("div", { className: "premium-surface overflow-hidden", children: loading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-2 text-muted-foreground", children: "Loading colleges..." })] })) : error ? (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-xl p-6 m-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertCircle, { className: "h-6 w-6 text-red-600 mr-3" }), _jsxs("div", { children: [_jsx("h3", { className: "text-red-800 font-medium", children: "Error loading colleges" }), _jsx("p", { className: "text-red-600 text-sm mt-1", children: error })] })] }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gradient-to-r from-gray-50 to-blue-50/30", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "College Name" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Type" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Location" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Admin" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Users" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Joined" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: colleges.length > 0 ? (colleges.map((college) => (_jsxs("tr", { className: "hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-purple-50/30 transition-all duration-200", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3", children: _jsx(Building, { className: "h-5 w-5 text-white" }) }), _jsx("span", { className: "text-sm font-medium text-foreground", children: college.name })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-muted-foreground", children: college.type }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-muted-foreground", children: college.location }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-foreground", children: college.admin.name }), _jsx("div", { className: "text-sm text-muted-foreground", children: college.admin.email })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex space-x-2", children: [_jsxs("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full", children: [college.users.students.toLocaleString(), " students"] }), _jsxs("span", { className: "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", children: [college.users.teachers, " teachers"] })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadge(college.status), children: college.status }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-muted-foreground", children: college.joined ? new Date(college.joined).toLocaleDateString() : '—' }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { type: "button", className: "p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200", children: _jsx(Eye, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", className: "p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200", children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx("button", { type: "button", onClick: () => handleDeleteCollege(college.id), className: "p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200", title: "Delete college", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }) })] }, college.id)))) : (_jsx("tr", { children: _jsxs("td", { colSpan: 8, className: "px-6 py-12 text-center text-muted-foreground", children: [_jsx(Building, { className: "h-12 w-12 mx-auto mb-3 text-gray-300" }), _jsx("p", { children: "No colleges found" })] }) })) })] }) })) })] }));
    const renderCollegeProfile = () => _jsx(AdminCollegeProfileTab, { isCollegeScoped });
    const renderNotices = () => _jsx(AdminNoticesTab, { isCollegeScoped });
    const renderStudents = () => _jsx(AdminStudentsTab, { isCollegeScoped, onUsersMutated: refreshOverviewStats });
    const renderTeachers = () => _jsx(AdminTeachersTab, { isCollegeScoped, onUsersMutated: refreshOverviewStats });
    const renderAlumni = () => _jsx(AdminAlumniTab, { onUsersMutated: refreshOverviewStats });
    const renderAnalytics = () => (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold text-foreground", children: "Analytics Dashboard" }), _jsx("p", { className: "text-muted-foreground mt-1", children: "Platform insights and statistics" })] }), loading ? (_jsxs("div", { className: "flex items-center justify-center py-12 text-muted-foreground", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-blue-600 mr-2" }), "Loading analytics\u2026"] })) : error && activeTab === 'analytics' ? (_jsx("div", { className: "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", children: error })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [analyticsSummary &&
                        Object.entries(analyticsSummary).map(([key, val]) => (_jsxs("div", { className: "premium-surface p-6", children: [_jsx("p", { className: "text-sm text-muted-foreground capitalize", children: key.replace(/_/g, ' ') }), _jsx("p", { className: "text-3xl font-bold text-foreground mt-1", children: Number(val).toLocaleString() })] }, key))), !analyticsSummary && (_jsx("p", { className: "text-muted-foreground text-sm", children: "No summary returned from the API." }))] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "premium-surface p-6", children: [_jsx("h3", { className: "text-lg font-bold text-foreground mb-4", children: "User Growth" }), _jsx("div", { className: "h-64 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl flex items-center justify-center", children: _jsx("p", { className: "text-muted-foreground", children: "Charts can be added when time-series data is available." }) })] }), _jsxs("div", { className: "premium-surface p-6", children: [_jsx("h3", { className: "text-lg font-bold text-foreground mb-4", children: "College Distribution" }), _jsx("div", { className: "h-64 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-center justify-center", children: _jsx("p", { className: "text-muted-foreground", children: "Charts can be added when distribution data is available." }) })] })] })] }));
    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return renderOverview();
            case 'colleges': return renderColleges();
            case 'college-profile': return renderCollegeProfile();
            case 'notices': return renderNotices();
            case 'students': return renderStudents();
            case 'teachers': return renderTeachers();
            case 'alumni': return renderAlumni();
            case 'analytics': return renderAnalytics();
            default: return renderOverview();
        }
    };
    const tabNav = (
        _jsx(PlatformTabs, {
            tabs,
            activeKey: activeTab,
            onChange: setActiveTab,
            ariaLabel: "Admin sections",
            shell: true,
            shellClassName: "admin-portal-tabs",
            className: "admin-portal-tabs__list",
        })
    );
    return (_jsxs("div", { className: "platform-page lg:py-8", children: [showAddCollege && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm", children: _jsxs("div", { className: "premium-surface max-w-md w-full p-6 shadow-modal", children: [_jsx("h2", { className: "text-lg font-bold text-foreground mb-4", children: "Add college (tenant)" }), _jsxs("form", { onSubmit: submitCreateCollege, className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Name *" }), _jsx("input", { required: true, className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.name, onChange: (e) => setCreateForm((f) => ({ ...f, name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Type" }), _jsxs("select", { className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.type, onChange: (e) => setCreateForm((f) => ({ ...f, type: e.target.value })), children: [_jsx("option", { value: "University", children: "University" }), _jsx("option", { value: "Engineering", children: "Engineering" }), _jsx("option", { value: "Arts College", children: "Arts College" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Location" }), _jsx("input", { className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.location, onChange: (e) => setCreateForm((f) => ({ ...f, location: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Website / domain" }), _jsx("input", { placeholder: "example.edu", className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.domain, onChange: (e) => setCreateForm((f) => ({ ...f, domain: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Admin contact name" }), _jsx("input", { className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.admin_name, onChange: (e) => setCreateForm((f) => ({ ...f, admin_name: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-muted-foreground", children: "Admin contact email" }), _jsx("input", { type: "email", className: "mt-1 w-full border rounded-xl px-3 py-2", value: createForm.admin_email, onChange: (e) => setCreateForm((f) => ({ ...f, admin_email: e.target.value })) })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setShowAddCollege(false), className: "flex-1 py-2 rounded-xl border border-border", children: "Cancel" }), _jsx("button", { type: "submit", disabled: createCollegeSaving, className: "flex-1 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50", children: createCollegeSaving ? 'Saving…' : 'Create' })] })] })] }) })), _jsx("div", { className: "glass-nav sticky top-[3.75rem] z-40 border-b border-border/50", children: _jsxs("div", { className: "platform-page__container px-4 py-6 sm:px-6", children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-elevated", children: _jsx(Shield, { className: "h-6 w-6 text-white" }) }), _jsxs("div", { children: [_jsx("h1", { className: "font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl", children: portalTitle }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: portalSubtitle })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("button", { type: "button", onClick: () => handleExport('students'), className: "flex items-center space-x-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200", children: [_jsx(Download, { className: "h-4 w-4 text-muted-foreground" }), _jsx("span", { className: "text-foreground", children: "Export students (CSV)" })] }), _jsx("button", { className: "p-2 bg-card border border-border rounded-xl hover:bg-muted/50 transition-all duration-200", children: _jsx(Settings, { className: "h-5 w-5 text-muted-foreground" }) })] })] }), tabNav] }) }), _jsx("div", { className: "platform-page__container px-4 py-8 sm:px-6", children: renderTabContent() })] }));
};
export default AdminDashboard;
