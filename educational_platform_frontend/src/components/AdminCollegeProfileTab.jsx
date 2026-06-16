// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  ImagePlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';
import adminService from '@/services/adminService';
import { resolveMediaUrl } from '@/services/postService';
import { useAuth } from '@/contexts/AuthContext';

const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const LOGO_ALLOWED_LABEL = 'PNG, JPG or WEBP';

const INSTITUTION_TYPES = ['University', 'Engineering', 'Arts College'];
const ACCREDITATION_OPTIONS = ['', 'NAAC A+', 'UGC Approved'];

function validateLogoFile(file) {
  if (!file) return null;
  if (!LOGO_ALLOWED.includes(file.type)) return `Logo must be ${LOGO_ALLOWED_LABEL}.`;
  if (file.size > LOGO_MAX_BYTES) return 'Logo must be 5 MB or smaller.';
  return null;
}

function emptyForm() {
  return {
    name: '',
    short_name: '',
    type: 'University',
    affiliation: '',
    accreditation_status: '',
    established_year: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    address: {
      full_address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
    },
  };
}

function resolveProfileLogo(url) {
  if (!url) return '';
  return resolveMediaUrl(url) || url;
}

function normalizeProfile(data) {
  if (!data) return data;
  return {
    ...data,
    logo_url: data.logo_url ? resolveProfileLogo(data.logo_url) : null,
  };
}

function hydrateForm(profile) {
  if (!profile) return emptyForm();
  return {
    name: profile.name || '',
    short_name: profile.short_name || '',
    type: INSTITUTION_TYPES.includes(profile.type) ? profile.type : 'University',
    affiliation: profile.affiliation || '',
    accreditation_status: ACCREDITATION_OPTIONS.includes(profile.accreditation_status)
      ? profile.accreditation_status
      : '',
    established_year:
      profile.established_year != null && profile.established_year !== ''
        ? String(profile.established_year)
        : '',
    website: profile.website || '',
    contact_email: profile.contact_email || '',
    contact_phone: profile.contact_phone || '',
    description: profile.description || profile.about || '',
    address: {
      full_address: profile.address?.full_address || '',
      city: profile.address?.city || '',
      state: profile.address?.state || '',
      country: profile.address?.country || 'India',
      pincode: profile.address?.pincode || '',
    },
  };
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-border/55 bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-border/40 px-5 py-4 sm:px-6">
        {Icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive" aria-hidden>*</span> : null}
      </span>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15';
const selectClass = inputClass;
const textareaClass = `${inputClass} resize-none leading-relaxed`;

export default function AdminCollegeProfileTab({ isCollegeScoped }) {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const previewUrlRef = useRef('');
  const fileInputRef = useRef(null);
  const successTimerRef = useRef(null);

  const flashSuccess = useCallback((message) => {
    setSuccess(message);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(''), 3500);
  }, []);

  useEffect(() => () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getMyCollege();
      setProfile(normalizeProfile(data));
      setForm(hydrateForm(data));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load college profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [profile?.logo_url, logoPreview]);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const setAddressField = (key, value) =>
    setForm((p) => ({ ...p, address: { ...(p.address || {}), [key]: value } }));

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
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
    setLogoLoadFailed(false);
  };

  const clearStagedLogo = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setLogoFile(null);
    setLogoPreview('');
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const persistLogo = async () => {
    if (!logoFile) return;
    setLogoBusy(true);
    setError('');
    try {
      const updated = await adminService.uploadMyCollegeLogo(logoFile);
      setProfile(normalizeProfile(updated));
      setForm(hydrateForm(updated));
      clearStagedLogo();
      flashSuccess('Logo updated.');
      if (updateUser && user && user.tenant_id === updated.id) {
        updateUser({ tenant_logo_url: updated.logo_url || null });
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Logo upload failed');
    } finally {
      setLogoBusy(false);
    }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    setError('');
    try {
      const updated = await adminService.removeMyCollegeLogo();
      setProfile(normalizeProfile(updated));
      setLogoLoadFailed(false);
      setForm(hydrateForm(updated));
      clearStagedLogo();
      flashSuccess('Logo removed.');
      if (updateUser && user && user.tenant_id === updated.id) {
        updateUser({ tenant_logo_url: null });
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Logo removal failed');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!form.name.trim()) {
      setError('College name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        type: form.type,
        affiliation: form.affiliation.trim(),
        accreditation_status: form.accreditation_status,
        established_year: form.established_year ? Number(form.established_year) : null,
        website: form.website.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim(),
        description: form.description.trim(),
        address: {
          full_address: form.address.full_address.trim(),
          city: form.address.city.trim(),
          state: form.address.state.trim(),
          country: form.address.country.trim() || 'India',
          pincode: form.address.pincode.trim(),
        },
      };
      const updated = await adminService.updateMyCollege(payload, logoFile || undefined);
      setProfile(normalizeProfile(updated));
      setForm(hydrateForm(updated));
      clearStagedLogo();
      setLogoLoadFailed(false);
      flashSuccess('College profile saved.');
      if (updateUser && user && user.tenant_id === updated.id) {
        updateUser({
          tenant_name: updated.name,
          tenant_logo_url: updated.logo_url || null,
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const formDirty = useMemo(() => {
    if (!profile) return false;
    const base = hydrateForm(profile);
    return JSON.stringify(base) !== JSON.stringify(form);
  }, [profile, form]);

  const hasUnsavedChanges = formDirty || Boolean(logoFile);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Loading college profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{error || 'Could not load college profile.'}</p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const liveLogo = logoPreview || profile.logo_url || '';
  const showLogoPreview = Boolean(liveLogo) && !logoLoadFailed;

  const saveStatusMessage = (() => {
    if (logoFile && formDirty) return 'Unsaved profile and logo changes.';
    if (logoFile) return 'New logo selected — click Save changes to apply.';
    if (formDirty) return 'You have unsaved changes.';
    return 'Everything is up to date.';
  })();

  return (
    <div className="space-y-6">
      {/* Heading */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">College profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your institution&apos;s branding, contact details, and registration information.
            {isCollegeScoped ? (
              <> Changes apply to your college only.</>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile.updated_at || profile.profile_updated_at ? (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(profile.profile_updated_at || profile.updated_at).toLocaleString()}
            </span>
          ) : null}
        </div>
      </header>

      {/* Status banners */}
      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded-lg p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {success ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {/* ── Branding ── */}
      <SectionCard
        icon={ImagePlus}
        title="Branding"
        description="Logo appears in the header, institution cards, and college pages across the platform."
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="shrink-0">
            <label
              className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
              aria-label="Upload college logo"
            >
              {showLogoPreview ? (
                <>
                  <img
                    src={liveLogo}
                    alt="College logo preview"
                    className="h-full w-full object-contain p-2"
                    onError={() => setLogoLoadFailed(true)}
                  />
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="h-6 w-6" />
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Building2 className="h-7 w-7 opacity-60" />
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
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <p className="text-muted-foreground">
              Square image works best. Recommended 512×512&nbsp;px (min 256×256). {LOGO_ALLOWED_LABEL} · max 5&nbsp;MB.
            </p>
            {logoError ? (
              <p className="text-xs font-medium text-destructive">{logoError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              {logoFile ? (
                <>
                  <button
                    type="button"
                    onClick={() => void persistLogo()}
                    disabled={logoBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {logoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Save logo
                  </button>
                  <button
                    type="button"
                    onClick={clearStagedLogo}
                    disabled={logoBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </>
              ) : profile.logo_url ? (
                <button
                  type="button"
                  onClick={() => void removeLogo()}
                  disabled={logoBusy}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-card px-3.5 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
                >
                  {logoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Remove logo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── Institution information ── */}
      <SectionCard
        icon={Building2}
        title="Institution information"
        description="Official name, type, and accreditation visible to all students and staff."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="College name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={inputClass}
              placeholder="R. C. Patel Institute of Technology"
              required
            />
          </Field>
          <Field label="Short name" hint="Used in compact UI (header, breadcrumbs).">
            <input
              type="text"
              value={form.short_name}
              onChange={(e) => setField('short_name', e.target.value)}
              className={inputClass}
              placeholder="RCPIT"
              maxLength={64}
            />
          </Field>
          <Field label="Institution type">
            <select
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              className={selectClass}
            >
              {INSTITUTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Affiliation" hint="University or board the college is affiliated to.">
            <input
              type="text"
              value={form.affiliation}
              onChange={(e) => setField('affiliation', e.target.value)}
              className={inputClass}
              placeholder="KBC North Maharashtra University"
            />
          </Field>
          <Field label="Accreditation">
            <select
              value={form.accreditation_status}
              onChange={(e) => setField('accreditation_status', e.target.value)}
              className={selectClass}
            >
              <option value="">Not specified</option>
              <option value="NAAC A+">NAAC A+</option>
              <option value="UGC Approved">UGC Approved</option>
            </select>
          </Field>
          <Field label="Established year">
            <input
              type="number"
              min="1800"
              max="2100"
              value={form.established_year}
              onChange={(e) => setField('established_year', e.target.value)}
              className={inputClass}
              placeholder="2001"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" hint="Short summary shown on public college pages.">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className={textareaClass}
                placeholder="A brief description of your institution, programs, and mission…"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Contact ── */}
      <SectionCard
        icon={Mail}
        title="Contact information"
        description="Public contact details for prospective students and visitors."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setField('contact_email', e.target.value)}
                className={`${inputClass} pl-9`}
                placeholder="info@example.edu"
              />
            </div>
          </Field>
          <Field label="Contact phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setField('contact_phone', e.target.value)}
                className={`${inputClass} pl-9`}
                placeholder="+91 12345 67890"
              />
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Website">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                  className={`${inputClass} pl-9`}
                  placeholder="https://example.edu"
                />
              </div>
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Location ── */}
      <SectionCard
        icon={MapPin}
        title="Location"
        description="Primary campus address. Multi-campus support coming later."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full address">
              <textarea
                rows={2}
                value={form.address.full_address}
                onChange={(e) => setAddressField('full_address', e.target.value)}
                className={textareaClass}
                placeholder="Street, area, landmark"
              />
            </Field>
          </div>
          <Field label="City">
            <input
              type="text"
              value={form.address.city}
              onChange={(e) => setAddressField('city', e.target.value)}
              className={inputClass}
              placeholder="Shirpur"
            />
          </Field>
          <Field label="State">
            <input
              type="text"
              value={form.address.state}
              onChange={(e) => setAddressField('state', e.target.value)}
              className={inputClass}
              placeholder="Maharashtra"
            />
          </Field>
          <Field label="Country">
            <input
              type="text"
              value={form.address.country}
              onChange={(e) => setAddressField('country', e.target.value)}
              className={inputClass}
              placeholder="India"
            />
          </Field>
          <Field label="Postal code">
            <input
              type="text"
              value={form.address.pincode}
              onChange={(e) => setAddressField('pincode', e.target.value)}
              className={inputClass}
              placeholder="425405"
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Status ── */}
      <SectionCard icon={ShieldCheck} title="Registration status" description="Approval and identity metadata.">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
              {profile.status || 'pending'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</dt>
            <dd className="mt-1 font-mono text-sm text-foreground">{profile.slug || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered</dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:px-5">
        <p className="text-sm text-muted-foreground">
          {saveStatusMessage}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(hydrateForm(profile));
              clearStagedLogo();
              setLogoLoadFailed(false);
            }}
            disabled={!hasUnsavedChanges || saving}
            className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!hasUnsavedChanges || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
