import React, { useState, useEffect, useRef } from 'react';
import { Building2, ImagePlus, X } from 'lucide-react';
import superAdminService from '@/services/superAdminService';

const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const LOGO_ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
const LOGO_ALLOWED_LABEL = 'PNG, JPG, WEBP or SVG';

function validateLogoFile(file) {
  if (!file) return null;
  if (!LOGO_ALLOWED.includes(file.type)) {
    return `Logo must be ${LOGO_ALLOWED_LABEL}.`;
  }
  if (file.size > LOGO_MAX_BYTES) {
    return 'Logo must be 5 MB or smaller.';
  }
  return null;
}

export default function SuperAdminAddCollegeModal({ open, onClose, onSuccess, onError }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('University');
  const [location, setLocation] = useState('');
  const [domain, setDomain] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const previewUrlRef = useRef('');
  const fileInputRef = useRef(null);

  // Reset form whenever the modal closes so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setName('');
      setType('University');
      setLocation('');
      setDomain('');
      setLogoFile(null);
      setLogoError('');
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = '';
      }
      setLogoPreview('');
      setSaving(false);
    }
  }, [open]);

  // Escape + body scroll lock while the modal is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saving]);

  // Always revoke the active object URL on unmount.
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  if (!open) return null;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setLogoError('');
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    if (!file) {
      setLogoFile(null);
      setLogoPreview('');
      return;
    }
    const err = validateLogoFile(file);
    if (err) {
      setLogoError(err);
      setLogoFile(null);
      setLogoPreview('');
      // Allow reselecting the same file after a rejection.
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
  };

  const handleRemoveLogo = () => {
    setLogoError('');
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      onError?.('College name is required.');
      return;
    }
    if (logoError) return;
    setSaving(true);
    onError?.('');
    try {
      const created = await superAdminService.createCollege(
        {
          name: name.trim(),
          type: type || 'University',
          location: location.trim(),
          domain: domain.trim(),
        },
        logoFile || undefined,
      );
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
      onClick={() => { if (!saving) onClose?.(); }}
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
          {/* ── Logo upload ── */}
          <div className="sa-modal__field">
            <label className="sa-modal__label">College logo (optional)</label>
            <div className="flex items-start gap-3">
              <label
                className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                aria-label="Upload college logo"
              >
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Building2 className="h-6 w-6 opacity-60" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Logo</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={LOGO_ALLOWED.join(',')}
                  onChange={handleLogoChange}
                  className="sr-only"
                />
              </label>
              <div className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                <p>
                  Square image works best. Recommended 512&times;512&nbsp;px (min 256&times;256).
                </p>
                <p className="mt-1">
                  {LOGO_ALLOWED_LABEL} &middot; max 5&nbsp;MB.
                </p>
                {logoFile ? (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-destructive transition-colors hover:underline"
                  >
                    <X className="h-3 w-3" />
                    Remove selected logo
                  </button>
                ) : null}
              </div>
            </div>
            {logoError ? (
              <p className="sa-modal__hint text-destructive">{logoError}</p>
            ) : null}
          </div>

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
              disabled={saving}
              className="sa-portal__btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !!logoError}
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
