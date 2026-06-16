// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import {
  X, Send, Loader2, Building2, MapPin, DollarSign, Link2,
  Calendar, Globe, Lock, Briefcase, GraduationCap, AlertCircle, ImagePlus,
} from 'lucide-react';
import { JOB_TYPES, JOB_CATEGORIES } from './jobUtils';
import JobSkillsPicker from './JobSkillsPicker';

const EMPTY = {
  title: '',
  company_name: '',
  category: 'full_time',
  job_type: 'full-time',
  location: '',
  description: '',
  apply_url: '',
  is_remote: false,
  visibility: 'global',
  salary_min: '',
  salary_max: '',
  salary_currency: 'INR',
  application_deadline: '',
  company_logo: null,
  skills: [],
};

const INPUT =
  'w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors';
const SELECT =
  'w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors appearance-none';

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-foreground">
      {children}
      {required && <span className="text-destructive" aria-hidden>*</span>}
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
        <div className="h-5 w-9 rounded-full border border-border/60 bg-muted transition-all peer-checked:border-primary peer-checked:bg-primary" />
        <div className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </label>
  );
}

export default function CreateJobModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const previewRef = useRef('');
  const titleRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const resetForm = () => {
    setForm(EMPTY);
    setError('');
    if (previewRef.current) { URL.revokeObjectURL(previewRef.current); previewRef.current = ''; }
    setLogoPreview('');
  };

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 60);
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  if (!open) return null;

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (!file) { previewRef.current = ''; setLogoPreview(''); set('company_logo', null); return; }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setLogoPreview(url);
    set('company_logo', file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.company_name.trim() || !form.description.trim()) {
      setError('Job title, company name, and description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: form.title.trim(),
        company_name: form.company_name.trim(),
        category: form.category,
        job_type: form.job_type,
        location: form.location.trim(),
        description: form.description.trim(),
        apply_url: form.apply_url.trim() || undefined,
        is_remote: form.is_remote,
        visibility: form.visibility,
        company_logo: form.company_logo,
        salary_range: {
          min: form.salary_min ? Number(form.salary_min) : null,
          max: form.salary_max ? Number(form.salary_max) : null,
          currency: form.salary_currency,
          period: 'yearly',
        },
        application_deadline: form.application_deadline || undefined,
        experience_level: 'entry',
        education_level: 'bachelor',
        skills_required: form.skills.map((s) => s.skill_name),
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">Post a job opportunity</h2>
            <p className="text-xs text-muted-foreground">Reach students across colleges with your opening.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">

          {/* ── Company ── */}
          <div className="space-y-4">
            <SectionHeader icon={Building2} label="Company" />

            <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
              {/* Logo upload */}
              <label className="group relative block cursor-pointer">
                <div className={[
                  'flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
                  logoPreview ? 'border-border/40' : 'border-border/50 hover:border-sky-400/60 hover:bg-sky-50/50',
                ].join(' ')}>
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="" className="h-full w-full object-cover rounded-[14px]" />
                      <div className="absolute inset-0 flex items-center justify-center rounded-[14px] bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <ImagePlus className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <Building2 className="h-6 w-6 text-muted-foreground/50" />
                      <span className="text-[9px] font-semibold text-muted-foreground/60">Logo</span>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>

              <div className="space-y-3">
                <div>
                  <FieldLabel required>Company name</FieldLabel>
                  <input
                    value={form.company_name}
                    onChange={(e) => set('company_name', e.target.value)}
                    placeholder="e.g. Infosys, TCS, Startup Inc."
                    className={INPUT}
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel required>Job title</FieldLabel>
              <input
                ref={titleRef}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Software Engineer Intern, Product Manager"
                className={INPUT}
              />
            </div>
          </div>

          {/* ── Visibility ── */}
          <div>
            <FieldLabel>Visibility</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'global', icon: Globe, title: 'All colleges', desc: 'Visible to students everywhere' },
                { id: 'college_only', icon: Lock, title: 'My college', desc: 'Only your institution can see this' },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = form.visibility === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => set('visibility', opt.id)}
                    className={[
                      'group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all',
                      active
                        ? 'border-primary/50 bg-primary/[0.06] ring-1 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/40',
                    ].join(' ')}
                  >
                    <span className={['flex h-7 w-7 items-center justify-center rounded-lg', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'].join(' ')}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{opt.title}</span>
                    <span className="text-[11px] leading-snug text-muted-foreground">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Job Details ── */}
          <div className="space-y-4">
            <SectionHeader icon={Briefcase} label="Job details" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Category</FieldLabel>
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className={SELECT}>
                  {JOB_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Job type</FieldLabel>
                <select value={form.job_type} onChange={(e) => set('job_type', e.target.value)} className={SELECT}>
                  {JOB_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder="City or Remote"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Apply URL</FieldLabel>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.apply_url}
                    onChange={(e) => set('apply_url', e.target.value)}
                    placeholder="https://company.com/careers/…"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Compensation ── */}
          <div className="space-y-4">
            <SectionHeader icon={DollarSign} label="Compensation" />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Min salary</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.salary_min}
                  onChange={(e) => set('salary_min', e.target.value)}
                  placeholder="0"
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel>Max salary</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={form.salary_max}
                  onChange={(e) => set('salary_max', e.target.value)}
                  placeholder="0"
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel>Currency</FieldLabel>
                <select value={form.salary_currency} onChange={(e) => set('salary_currency', e.target.value)} className={SELECT}>
                  <option value="INR">INR ₹</option>
                  <option value="USD">USD $</option>
                  <option value="EUR">EUR €</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70">Per year. Leave blank if compensation is not public.</p>
          </div>

          {/* ── Role details ── */}
          <div className="space-y-4">
            <SectionHeader icon={GraduationCap} label="Role details" />

            <div>
              <FieldLabel required>Job description</FieldLabel>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={5}
                placeholder="Describe responsibilities, team culture, and what success looks like in this role…"
                className={`${INPUT} resize-none`}
              />
            </div>

            <div>
              <FieldLabel>Skills required</FieldLabel>
              <JobSkillsPicker
                skills={form.skills}
                onChange={(skills) => set('skills', skills)}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Application deadline</FieldLabel>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    value={form.application_deadline}
                    onChange={(e) => set('application_deadline', e.target.value)}
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
            </div>

            <ToggleRow
              label="Remote-friendly role"
              description="Candidates can work from anywhere"
              checked={form.is_remote}
              onChange={(e) => set('is_remote', e.target.checked)}
            />
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/50 bg-muted/30 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !form.title.trim() || !form.company_name.trim()}
            onClick={handleSubmit}
            className="jobs-btn jobs-btn--primary h-9 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Publishing…' : 'Publish job'}
          </button>
        </div>
      </div>
    </div>
  );
}
