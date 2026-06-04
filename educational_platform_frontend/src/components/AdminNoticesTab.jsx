import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Loader2, AlertCircle, Plus, Pin, Trash2, Pencil } from 'lucide-react';
import adminService from '@/services/adminService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function defaultNowLocal() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminNoticesTab({ isCollegeScoped }) {
  const [colleges, setColleges] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => ({
    title: '',
    body: '',
    starts_at: defaultNowLocal(),
    ends_at: '',
    is_pinned: false,
  }));
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tid = isCollegeScoped ? undefined : tenantId;
      if (!isCollegeScoped && !tid) {
        setNotices([]);
        setLoading(false);
        return;
      }
      const list = await adminService.listNotices({ tenant_id: tid });
      setNotices(list);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load notices');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, [isCollegeScoped, tenantId]);

  useEffect(() => {
    if (!isCollegeScoped) {
      let cancelled = false;
      (async () => {
        try {
          const d = await adminService.getColleges({ limit: 200, page: 1 });
          const opts = d.colleges || [];
          if (!cancelled) {
            setColleges(opts);
            setTenantId((prev) => prev || opts[0]?.id || '');
          }
        } catch {
          if (!cancelled) setColleges([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [isCollegeScoped]);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ title: '', body: '', starts_at: defaultNowLocal(), ends_at: '', is_pinned: false });
  };

  useEffect(() => {
    if (!isCollegeScoped) {
      setEditingId(null);
      setForm({ title: '', body: '', starts_at: defaultNowLocal(), ends_at: '', is_pinned: false });
    }
  }, [tenantId, isCollegeScoped]);

  const startEdit = (n) => {
    setEditingId(n.id);
    setForm({
      title: n.title || '',
      body: n.body || '',
      starts_at: toDatetimeLocalValue(n.starts_at) || defaultNowLocal(),
      ends_at: toDatetimeLocalValue(n.ends_at),
      is_pinned: Boolean(n.is_pinned),
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!isCollegeScoped && !tenantId) {
      setError('Select a college.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_pinned: form.is_pinned,
      };
      if (!isCollegeScoped) payload.tenant_id = tenantId;
      if (editingId) {
        await adminService.updateNotice(editingId, payload);
      } else {
        await adminService.createNotice(payload);
      }
      await loadNotices();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const archive = (notice) => {
    const target = typeof notice === 'object' ? notice : notices.find((n) => n.id === notice);
    setArchiveTarget(target || { id: notice, title: '' });
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    const id = archiveTarget.id;
    setArchiving(true);
    setError('');
    try {
      await adminService.archiveNotice(id);
      await loadNotices();
      if (editingId === id) resetForm();
      setArchiveTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Archive failed');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Megaphone className="h-7 w-7 text-orange-500" />
          Notice board
        </h2>
        <p className="mt-1 text-muted-foreground">
          Publish time-bound announcements for students, teachers, and alumni of your college. They appear on the home
          notice board while active.
        </p>
      </div>

      {!isCollegeScoped ? (
        <div className="rounded-2xl border border-border/50 bg-card/90 p-4 shadow-lg">
          <label className="text-sm font-medium text-muted-foreground">College</label>
          <select
            className="mt-1 w-full max-w-md rounded-xl border border-border bg-background px-3 py-2"
            value={tenantId}
            onChange={(ev) => setTenantId(ev.target.value)}
          >
            {colleges.length === 0 ? <option value="">No colleges</option> : null}
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={(e) => void submit(e)}
          className="rounded-2xl border border-border/50 bg-card/90 p-5 shadow-lg space-y-3"
        >
          <h3 className="text-lg font-semibold text-foreground">{editingId ? 'Edit notice' : 'New notice'}</h3>
          <div>
            <label className="text-sm text-muted-foreground">Title *</label>
            <input
              required
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={form.title}
              onChange={(ev) => setForm((f) => ({ ...f, title: ev.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Message</label>
            <textarea
              rows={6}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={form.body}
              onChange={(ev) => setForm((f) => ({ ...f, body: ev.target.value }))}
              placeholder="Exam timetable, holiday, registration deadline…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground">Visible from *</label>
              <input
                type="datetime-local"
                required
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.starts_at}
                onChange={(ev) => setForm((f) => ({ ...f, starts_at: ev.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Visible until (optional)</label>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={form.ends_at}
                onChange={(ev) => setForm((f) => ({ ...f, ends_at: ev.target.value }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(ev) => setForm((f) => ({ ...f, is_pinned: ev.target.checked }))}
            />
            Pin to top
          </label>
          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || (!isCollegeScoped && !tenantId)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {saving ? 'Saving…' : editingId ? 'Update notice' : 'Publish notice'}
            </button>
            {editingId ? (
              <button type="button" onClick={() => resetForm()} className="rounded-xl border border-border px-4 py-2.5 text-sm">
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-2xl border border-border/50 bg-card/90 p-5 shadow-lg">
          <h3 className="mb-3 text-lg font-semibold text-foreground">All notices</h3>
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              Loading…
            </div>
          ) : !isCollegeScoped && !tenantId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Select a college to manage notices.</p>
          ) : notices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No notices yet for this college.</p>
          ) : (
            <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {notices.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    n.is_archived ? 'border-border/40 bg-muted/30 opacity-70' : 'border-border/60 bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {n.is_pinned ? <Pin className="mr-1 inline h-3.5 w-3.5 text-primary" /> : null}
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.is_archived ? 'Archived · ' : ''}
                        {n.starts_at ? new Date(n.starts_at).toLocaleString() : ''}
                        {n.ends_at ? ` → ${new Date(n.ends_at).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => startEdit(n)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!n.is_archived ? (
                        <button
                          type="button"
                          title="Archive"
                          onClick={() => archive(n)}
                          className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(open) => { if (!open && !archiving) setArchiveTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this notice?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.title ? (
                <>
                  <strong className="text-foreground">{archiveTarget.title}</strong>
                  {' '}will be removed from the board. It can be restored later from archive.
                </>
              ) : (
                'This notice will be removed from the board. It can be restored later from archive.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiving}
              onClick={(e) => { e.preventDefault(); void confirmArchive(); }}
              className="inline-flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Trash2 className="h-4 w-4" />
              Archive notice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
