// @ts-nocheck
import { useEffect } from 'react';
import {
  X, MapPin, DollarSign, Calendar, Building2, ExternalLink, Briefcase,
  CheckCircle2, Clock, GraduationCap, Users, Eye, Globe, Lock, Loader2,
} from 'lucide-react';
import {
  jobTitle, companyLogoUrl, formatSalary, formatTimeAgo,
  categoryLabel, jobTypeLabel, experienceLevelLabel,
} from './jobUtils';

function MetaCard({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function JobDetailModal({ job, loading, onClose, onApply, isApplied, isOwner }) {
  useEffect(() => {
    if (!job) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [job, onClose]);

  if (!job) return null;
  const logo = companyLogoUrl(job);
  const salary = formatSalary(job.salary_range);
  const typeLabel = jobTypeLabel(job.job_type);
  const expLabel = experienceLevelLabel(job.experience_level);
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

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
            <h3 className="text-base font-semibold text-foreground">Job details</h3>
            {loading && (
              <p className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading full details…
              </p>
            )}
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
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-5 sm:px-6">
            {/* Company hero */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-sky-50 to-card shadow-sm ring-1 ring-black/[0.04]">
                {logo ? (
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-sky-500/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                  {jobTitle(job)}
                </h2>
                <p className="mt-1 text-sm font-semibold text-sky-600">{job.company_name || 'Company'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {job.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Posted {formatTimeAgo(job.created_at)}
                    </span>
                  )}
                  {(job.views_count ?? 0) > 0 && (
                    <>
                      <span className="text-border" aria-hidden>·</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {job.views_count} views
                      </span>
                    </>
                  )}
                  {(job.applications_count ?? 0) > 0 && (
                    <>
                      <span className="text-border" aria-hidden>·</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {job.applications_count} applicants
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5">
              {typeLabel && (
                <span className="jobs-badge jobs-badge--type">{typeLabel}</span>
              )}
              {job.category && (
                <span className="jobs-badge jobs-badge--category">{categoryLabel(job.category)}</span>
              )}
              {job.is_remote && (
                <span className="jobs-badge jobs-badge--remote">Remote</span>
              )}
              {expLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  {expLabel}
                </span>
              )}
              {job.visibility === 'college_only' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                  <Lock className="h-3 w-3" />
                  College only
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  <Globe className="h-3 w-3" />
                  All colleges
                </span>
              )}
            </div>

            {/* Metadata grid */}
            <div className="grid gap-2 sm:grid-cols-2">
              <MetaCard icon={MapPin} label="Location" value={job.location} />
              <MetaCard icon={DollarSign} label="Compensation" value={salary || 'Not listed'} />
              <MetaCard icon={Briefcase} label="Experience" value={expLabel} />
              <MetaCard icon={Calendar} label="Apply by" value={deadline} />
            </div>

            {/* Description */}
            {job.description?.trim() && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">About this role</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {job.description}
                </p>
              </div>
            )}

            {/* Requirements */}
            {(job.requirements || []).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Requirements</p>
                <ul className="space-y-2">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            {(job.skills_required || []).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Skills required</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills_required.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-sky-200/60 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External link */}
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200/60 bg-sky-50/80 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
              >
                <ExternalLink className="h-4 w-4" />
                View on company website
              </a>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        {isOwner ? (
          <div className="shrink-0 border-t border-border/50 bg-muted/30 px-5 py-3 text-center text-xs font-medium text-muted-foreground sm:px-6">
            This is your listing
          </div>
        ) : isApplied ? (
          <div className="shrink-0 flex items-center justify-center gap-2 border-t border-border/50 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 sm:px-6">
            <CheckCircle2 className="h-5 w-5" />
            You have applied to this role
          </div>
        ) : (
          <div className="shrink-0 flex gap-2 border-t border-border/50 bg-card px-5 py-4 sm:px-6">
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
              >
                <ExternalLink className="h-4 w-4" />
                External apply
              </a>
            )}
            <button
              type="button"
              onClick={() => onApply(job)}
              className="jobs-btn jobs-btn--primary flex flex-1 h-11 justify-center"
            >
              <Briefcase className="h-4 w-4" />
              Easy Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
