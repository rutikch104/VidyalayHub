import React, { useState, useEffect } from 'react';
import adminService from '@/services/adminService';

const USER_LABEL = {
  student: 'Student',
  teacher: 'Teacher',
  staff: 'Staff / college admin',
};

export default function AdminCreateUserModal({
  open,
  onClose,
  fixedUserType,
  isCollegeScoped,
  onSuccess,
  onError,
}) {
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadCollegesError, setLoadCollegesError] = useState('');
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setSubmitError('');
      setLoadCollegesError('');
      setTenantId('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setColleges([]);
      return;
    }
    if (isCollegeScoped) return;
    let cancelled = false;
    (async () => {
      setLoadingColleges(true);
      setLoadCollegesError('');
      try {
        const d = await adminService.getColleges({ limit: 200, page: 1 });
        const opts = d.colleges || [];
        if (!cancelled) {
          setColleges(opts);
          setTenantId(opts[0]?.id || '');
        }
      } catch {
        if (!cancelled) {
          setColleges([]);
          const msg = 'Could not load colleges.';
          setLoadCollegesError(msg);
          onError?.(msg);
        }
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload colleges when modal opens / scope changes
  }, [open, isCollegeScoped]);

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

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password || password.length < 6) {
      const msg = 'Email and a password of at least 6 characters are required.';
      setSubmitError(msg);
      onError?.(msg);
      return;
    }
    if (!isCollegeScoped && !tenantId) {
      const msg = 'Select a college.';
      setSubmitError(msg);
      onError?.(msg);
      return;
    }
    setSaving(true);
    setSubmitError('');
    onError?.('');
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim() || undefined,
        user_type: fixedUserType,
      };
      if (!isCollegeScoped) {
        payload.tenant_id = tenantId;
      }
      await adminService.createUser(payload);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to create user');
      setSubmitError(msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-user-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="admin-create-user-title" className="mb-1 text-lg font-bold text-foreground">
          Create {USER_LABEL[fixedUserType] || 'user'}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The account is active immediately. Share the password securely with the person; they sign in on the main
          login page.
        </p>
        {loadCollegesError ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loadCollegesError}
          </div>
        ) : null}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          {!isCollegeScoped ? (
            <div>
              <label className="text-sm text-muted-foreground">College *</label>
              {loadingColleges ? (
                <p className="mt-2 text-sm text-muted-foreground">Loading colleges…</p>
              ) : (
                <select
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                  value={tenantId}
                  onChange={(ev) => setTenantId(ev.target.value)}
                >
                  {colleges.length === 0 ? (
                    <option value="">No colleges</option>
                  ) : (
                    colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          ) : null}
          <div>
            <label className="text-sm text-muted-foreground">Email *</label>
            <input
              type="email"
              required
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">First name</label>
              <input
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Last name</label>
              <input
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Phone (optional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </div>
          {submitError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {submitError}
            </div>
          ) : null}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => onClose?.()} className="flex-1 rounded-xl border border-border py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!isCollegeScoped && (!tenantId || colleges.length === 0))}
              className="flex-1 rounded-xl bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
