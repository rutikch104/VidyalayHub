import React, { useState, useEffect } from 'react';
import superAdminService from '@/services/superAdminService';

export default function SuperAdminAddCollegeModal({ open, onClose, onSuccess, onError }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('University');
  const [location, setLocation] = useState('');
  const [domain, setDomain] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setName('');
      setType('University');
      setLocation('');
      setDomain('');
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      onError?.('College name is required.');
      return;
    }
    setSaving(true);
    onError?.('');
    try {
      const created = await superAdminService.createCollege({
        name: name.trim(),
        type: type || 'University',
        location: location.trim(),
        domain: domain.trim(),
      });
      onSuccess?.(created);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to create college');
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-admin-add-college-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="super-admin-add-college-title" className="mb-4 text-lg font-bold text-foreground">
          Add college (tenant)
        </h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">Name *</label>
            <input
              required
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Type</label>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={type}
              onChange={(ev) => setType(ev.target.value)}
            >
              <option value="University">University</option>
              <option value="Engineering">Engineering</option>
              <option value="Arts College">Arts College</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Location</label>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Website / domain (optional)</label>
            <input
              placeholder="example.edu"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={domain}
              onChange={(ev) => setDomain(ev.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Invalid values are ignored; leave blank if unsure.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="flex-1 rounded-xl border border-border py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
