import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Loader2,
  Check,
  AlertCircle,
  Mail,
  Search,
  UserPlus,
} from 'lucide-react';
import adminService from '@/services/adminService';
import AdminCreateUserModal from '@/components/AdminCreateUserModal';

function avatarFor(name, existing) {
  const u = existing?.trim();
  if (u && (u.startsWith('http://') || u.startsWith('https://'))) return u;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=6366f1&color=fff&size=128`;
}

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

export default function AdminStudentsTab({ isCollegeScoped = true, onUsersMutated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(isCollegeScoped ? 'All' : 'Pending');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminService.getStudents({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        limit: 100,
      });
      setStudents(d.students || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const handleApprove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await adminService.updateUserStatus(id, 'Active');
      await loadStudents();
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
        fixedUserType="student"
        isCollegeScoped={isCollegeScoped}
        onSuccess={() => {
          void loadStudents();
          onUsersMutated?.();
        }}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Students</h2>
          <p className="text-muted-foreground mt-1">
            Approve new registrations so they can sign in. Pending students are listed first by default.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:from-purple-700 hover:to-pink-700"
        >
          <UserPlus className="h-4 w-4" />
          Add student
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
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
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
          <Loader2 className="mr-2 h-8 w-8 animate-spin text-purple-600" />
          Loading students…
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-border/50 bg-card/90 py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-3 h-14 w-14 text-muted-foreground/40" />
          <p className="font-medium text-foreground">No students in this view</p>
          <p className="mt-1 text-sm">Try &quot;All&quot; or clear the search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl border border-border/50 bg-card/90 p-5 shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={avatarFor(student.name, student.avatar)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{student.name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
                <span className={statusBadgeClass(student.status)}>{student.status}</span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">Registered {formatJoined(student.joinDate)}</p>
              <div className="flex flex-wrap gap-2">
                {student.status === 'Pending' ? (
                  <button
                    type="button"
                    disabled={busyId === student.id}
                    onClick={() => void handleApprove(student.id)}
                    className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {busyId === student.id ? 'Saving…' : 'Approve'}
                  </button>
                ) : null}
                {student.email ? (
                  <a
                    href={`mailto:${student.email}`}
                    className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted"
                    title="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
