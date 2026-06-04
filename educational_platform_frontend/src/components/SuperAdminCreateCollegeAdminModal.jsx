import React, { useState, useEffect } from 'react';
import superAdminService from '@/services/superAdminService';

export default function SuperAdminCreateCollegeAdminModal({ open, onClose, initialCollegeId, onSuccess, onError }) {
  const [saving, setSaving] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [collegeOptions, setCollegeOptions] = useState([]);
  const [collegeId, setCollegeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

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
      setSaving(false);
      setLoadingColleges(false);
      setCollegeOptions([]);
      setCollegeId('');
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingColleges(true);
      onError?.('');
      try {
        const d = await superAdminService.getColleges({ limit: 200, page: 1 });
        const opts = (d.colleges || []).map((c) => ({ id: c.id, name: c.name }));
        if (cancelled) return;
        setCollegeOptions(opts);
        const preset = initialCollegeId && opts.some((o) => o.id === initialCollegeId) ? initialCollegeId : opts[0]?.id || '';
        setCollegeId(preset);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to load colleges');
          onError?.(msg);
          setCollegeOptions([]);
          setCollegeId('');
        }
      } finally {
        if (!cancelled) setLoadingColleges(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, initialCollegeId]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!collegeId) {
      onError?.('Select a college.');
      return;
    }
    if (!email.trim()) {
      onError?.('Email is required.');
      return;
    }
    if (password.length < 6) {
      onError?.('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    onError?.('');
    try {
      await superAdminService.createCollegePortalAdmin(collegeId, {
        email: email.trim().toLowerCase(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to create admin');
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="sa-modal-overlay"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-admin-portal-admin-title"
        className="sa-modal sa-modal--wide"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="super-admin-portal-admin-title" className="sa-modal__title">
          Create college admin
        </h2>
        <p className="sa-modal__desc mb-4">
          Creates login credentials for the main app. They use the regular sign-in page, then open Admin to approve
          students and manage that college.
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="sa-modal__field">
            <label className="sa-modal__label">College *</label>
            {loadingColleges ? (
              <p className="text-sm text-muted-foreground">Loading colleges…</p>
            ) : (
              <select
                required
                className="sa-modal__select"
                value={collegeId}
                onChange={(ev) => setCollegeId(ev.target.value)}
              >
                {collegeOptions.length === 0 ? (
                  <option value="">No colleges available</option>
                ) : (
                  collegeOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Email *</label>
            <input
              type="email"
              required
              autoComplete="off"
              className="sa-modal__input"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="sa-modal__input"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="sa-modal__field">
              <label className="sa-modal__label">First name</label>
              <input
                className="sa-modal__input"
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
              />
            </div>
            <div className="sa-modal__field">
              <label className="sa-modal__label">Last name</label>
              <input
                className="sa-modal__input"
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
              />
            </div>
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Phone (optional)</label>
            <input
              className="sa-modal__input"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </div>
          <div className="sa-modal__actions">
            <button type="button" onClick={() => onClose?.()} className="sa-portal__btn">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingColleges || collegeOptions.length === 0 || !collegeId}
              className="sa-portal__btn sa-portal__btn--primary"
            >
              {saving ? 'Creating…' : 'Create admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
