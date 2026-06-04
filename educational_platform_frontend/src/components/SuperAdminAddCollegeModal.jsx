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
      className="sa-modal-overlay"
      onClick={() => onClose?.()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-admin-add-college-title"
        className="sa-modal"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="super-admin-add-college-title" className="sa-modal__title mb-4">
          Add college (tenant)
        </h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div className="sa-modal__field">
            <label className="sa-modal__label">Name *</label>
            <input
              required
              className="sa-modal__input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
            />
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Type</label>
            <select
              className="sa-modal__select"
              value={type}
              onChange={(ev) => setType(ev.target.value)}
            >
              <option value="University">University</option>
              <option value="Engineering">Engineering</option>
              <option value="Arts College">Arts College</option>
            </select>
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Location</label>
            <input
              className="sa-modal__input"
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
            />
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label">Website / domain (optional)</label>
            <input
              placeholder="example.edu"
              className="sa-modal__input"
              value={domain}
              onChange={(ev) => setDomain(ev.target.value)}
            />
            <p className="sa-modal__hint">
              Invalid values are ignored; leave blank if unsure.
            </p>
          </div>
          <div className="sa-modal__actions">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="sa-portal__btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="sa-portal__btn sa-portal__btn--primary"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
