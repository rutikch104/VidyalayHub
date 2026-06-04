import React, { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, Check, AlertCircle, Mail, Search, UserPlus } from 'lucide-react';
import adminService from '@/services/adminService';
import AdminCreateUserModal from '@/components/AdminCreateUserModal';

function formatJoined(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return '—';
  }
}

function statusBadgeClass(status) {
  const base = 'px-3 py-1 rounded-full text-xs font-medium border';
  if (status === 'Active') return `${base} bg-green-100 text-green-800 border-green-200`;
  if (status === 'Pending') return `${base} bg-amber-100 text-amber-900 border-amber-200`;
  return `${base} bg-muted text-foreground border-border`;
}

export default function AdminTeachersTab({ isCollegeScoped = true, onUsersMutated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(isCollegeScoped ? 'All' : 'Pending');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminService.getTeachers({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        limit: 100,
      });
      setTeachers(d.teachers || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const handleApprove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await adminService.updateUserStatus(id, 'Active');
      await loadTeachers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        fixedUserType="teacher"
        isCollegeScoped={isCollegeScoped}
        onSuccess={() => {
          void loadTeachers();
          onUsersMutated?.();
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Teachers</h2>
          <p className="text-muted-foreground mt-1">
            Approve faculty registrations when your college uses manual approval.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-orange-700 hover:to-red-700"
        >
          <UserPlus className="h-4 w-4" />
          Add teacher
        </button>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card/90 p-4 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['Pending', 'All', 'Active'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                    : 'border border-border bg-card text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {f === 'Pending' ? 'Pending approval' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-orange-600" />
          Loading teachers…
        </div>
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/90 py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-14 w-14 text-muted-foreground/40" />
          <p className="font-medium text-foreground">No teachers in this view</p>
          <p className="mt-1 text-sm">Try &quot;All&quot; or clear the search filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-card/90 shadow-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatJoined(t.joined)}</td>
                  <td className="px-4 py-3">
                    <span className={statusBadgeClass(t.status)}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === 'Pending' ? (
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => void handleApprove(t.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {busyId === t.id ? '…' : 'Approve'}
                        </button>
                      ) : null}
                      {t.email ? (
                        <a
                          href={`mailto:${t.email}`}
                          className="inline-flex rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
