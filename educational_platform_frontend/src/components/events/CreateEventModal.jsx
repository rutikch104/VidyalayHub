// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Globe, Lock, ImagePlus, Clock, CalendarDays, MapPin, Users, Tag, Link2, Star, AlertCircle } from 'lucide-react';
import { EVENT_CATEGORIES, EVENT_TYPES } from './eventUtils';

const EMPTY = {
  title: '',
  description: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  visibility: 'college_only',
  event_type: 'seminar',
  category: 'Seminar',
  max_participants: '',
  tags: '',
  is_online: false,
  meeting_link: '',
  registration_deadline: '',
  is_featured: false,
  banner: null,
};

const INPUT =
  'w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors';
const SELECT =
  'w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors';

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
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

export default function CreateEventModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bannerPreview, setBannerPreview] = useState('');
  const previewUrlRef = useRef('');
  const titleRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const resetForm = () => {
    setForm(EMPTY);
    setError('');
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    }
    setBannerPreview('');
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

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  if (!open) return null;

  const handleBannerChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (!file) {
      previewUrlRef.current = '';
      setBannerPreview('');
      set('banner', null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setBannerPreview(url);
    set('banner', file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.start_time || !form.end_time) {
      setError('Title, date, start time, and end time are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location.trim(),
        visibility: form.visibility === 'global' ? 'global' : 'college_only',
        event_type: form.event_type,
        category: form.category,
        max_participants: form.max_participants ? Number(form.max_participants) : undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        is_online: form.is_online,
        meeting_link: form.meeting_link.trim() || undefined,
        registration_deadline: form.registration_deadline || undefined,
        is_featured: form.is_featured,
        banner: form.banner,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create event');
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
            <h2 className="text-base font-semibold text-foreground">Create an event</h2>
            <p className="text-xs text-muted-foreground">Publish to your college or open it to everyone.</p>
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

          {/* ── Banner upload ── */}
          <div>
            <FieldLabel>Banner image</FieldLabel>
            <label className={[
              'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
              bannerPreview
                ? 'h-40 border-border/40'
                : 'h-36 border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]',
            ].join(' ')}>
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} alt="Banner preview" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="h-6 w-6 text-white" />
                    <span className="text-xs font-semibold text-white">Change image</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2.5 p-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload event banner</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">JPEG, PNG, WebP · Recommended 1200 × 630</p>
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </label>
            {bannerPreview && (
              <button
                type="button"
                onClick={() => { set('banner', null); if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = ''; } setBannerPreview(''); }}
                className="mt-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove image
              </button>
            )}
          </div>

          {/* ── Visibility ── */}
          <div>
            <FieldLabel>Visibility</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'college_only', icon: Lock,  title: 'Private', desc: 'Only your college members can see this' },
                { id: 'global',       icon: Globe, title: 'Public',  desc: 'Open to students from all colleges' },
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

          {/* ── Basics ── */}
          <div className="space-y-4">
            <SectionHeader icon={CalendarDays} label="Event basics" />

            <div>
              <FieldLabel required>Event title</FieldLabel>
              <input
                ref={titleRef}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Annual Tech Summit 2026"
                className={INPUT}
              />
            </div>

            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="What is this event about? Who should attend?"
                className={`${INPUT} resize-none`}
              />
            </div>
          </div>

          {/* ── Schedule ── */}
          <div className="space-y-4">
            <SectionHeader icon={Clock} label="Schedule" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Event date</FieldLabel>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel>Registration deadline</FieldLabel>
                <input
                  type="date"
                  value={form.registration_deadline}
                  onChange={(e) => set('registration_deadline', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel required>Start time</FieldLabel>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => set('start_time', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <FieldLabel required>End time</FieldLabel>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => set('end_time', e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </div>

          {/* ── Details ── */}
          <div className="space-y-4">
            <SectionHeader icon={Tag} label="Details" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Category</FieldLabel>
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className={SELECT}>
                  {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <select value={form.event_type} onChange={(e) => set('event_type', e.target.value)} className={SELECT}>
                  {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Location</FieldLabel>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.location}
                    onChange={(e) => set('location', e.target.value)}
                    placeholder={form.is_online ? 'Online' : 'Venue / city'}
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Max attendees</FieldLabel>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min="1"
                    value={form.max_participants}
                    onChange={(e) => set('max_participants', e.target.value)}
                    placeholder="Unlimited"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Tags</FieldLabel>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="tech, ai, networking (comma-separated)"
                className={INPUT}
              />
              <p className="mt-1 text-[11px] text-muted-foreground/70">Separate tags with commas to help people discover your event.</p>
            </div>
          </div>

          {/* ── Options ── */}
          <div className="space-y-3">
            <SectionHeader icon={Star} label="Options" />

            <ToggleRow
              label="Online event"
              description="No physical venue — attendees join remotely"
              checked={form.is_online}
              onChange={(e) => set('is_online', e.target.checked)}
            />

            {form.is_online && (
              <div>
                <FieldLabel>Meeting link</FieldLabel>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={form.meeting_link}
                    onChange={(e) => set('meeting_link', e.target.value)}
                    placeholder="https://meet.google.com/…"
                    className={`${INPUT} pl-9`}
                  />
                </div>
              </div>
            )}

            <ToggleRow
              label="Feature this event"
              description="Display prominently with a Featured badge"
              checked={form.is_featured}
              onChange={(e) => set('is_featured', e.target.checked)}
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
            disabled={submitting || !form.title.trim()}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Publishing…' : 'Publish event'}
          </button>
        </div>
      </div>
    </div>
  );
}
