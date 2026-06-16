import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Loader2, Search, Eye } from 'lucide-react';
import adminService from '@/services/adminService';
import AdminRegistrationReviewModal from '@/components/admin/AdminRegistrationReviewModal';

function statusBadgeClass(status) {
  const base = 'px-3 py-1 rounded-full text-xs font-medium border';
  if (status === 'approved' || status === 'Active') return `${base} bg-green-100 text-green-800 border-green-200`;
  if (status === 'rejected') return `${base} bg-red-100 text-red-800 border-red-200`;
  if (status === 'under_review') return `${base} bg-blue-100 text-blue-800 border-blue-200`;
  return `${base} bg-amber-100 text-amber-900 border-amber-200`;
}

export default function AdminAlumniTab({ onUsersMutated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewId, setReviewId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadAlumni = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await adminService.getAlumni({
        search: debouncedSearch || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        limit: 100,
      });
      setAlumni(d.alumni || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load alumni');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => { void loadAlumni(); }, [loadAlumni]);

  return (
    <div className="space-y-6">
      <AdminRegistrationReviewModal
        userId={reviewId}
        open={Boolean(reviewId)}
        onClose={() => setReviewId(null)}
        onUpdated={() => { void loadAlumni(); onUsersMutated?.(); }}
      />
      <div>
        <h2 className="text-2xl font-bold">Alumni registrations</h2>
        <p className="mt-1 text-muted-foreground">Review and approve alumni verification requests.</p>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card/90 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search alumni…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm" />
          </div>
          <div className="flex flex-wrap gap-2">
            {['Pending', 'Under Review', 'All', 'Approved', 'Rejected'].map((f) => (
              <button key={f} type="button" onClick={() => setStatusFilter(f)} className={`rounded-lg px-3 py-2 text-sm font-medium ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>
      {error ? <div className="app-alert-error">{error}</div> : null}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : alumni.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground"><Briefcase className="mx-auto mb-3 h-12 w-12 opacity-40" />No alumni in this view</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alumni.map((person) => (
            <div key={person.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{person.name}</h3>
                  <p className="text-sm text-muted-foreground">{person.email}</p>
                </div>
                <span className={statusBadgeClass(person.registration_status || person.status)}>{person.registration_status_label || person.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{person.branch || person.department || '—'} · {person.company || '—'}</p>
              <button type="button" onClick={() => setReviewId(person.id)} className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                <Eye className="h-4 w-4" /> Review application
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
