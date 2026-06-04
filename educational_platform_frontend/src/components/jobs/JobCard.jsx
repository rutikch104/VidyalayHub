// @ts-nocheck
import {
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Bookmark,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Briefcase,
  Users,
  Eye,
  ChevronRight,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import {
  jobTitle,
  companyLogoUrl,
  formatSalary,
  formatTimeAgo,
  categoryLabel,
  jobTypeLabel,
  experienceLevelLabel,
} from './jobUtils';

function MetaItem({ icon: Icon, children, highlight }) {
  if (!children) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${
        highlight
          ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200/60'
          : 'bg-muted/40 text-muted-foreground'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

export default function JobCard({
  job,
  isBookmarked,
  isApplied,
  isOwner,
  trending,
  onOpen,
  onBookmark,
  onApply,
}) {
  const logo = companyLogoUrl(job);
  const salary = formatSalary(job.salary_range);
  const timeAgo = formatTimeAgo(job.created_at);
  const typeLabel = jobTypeLabel(job.job_type);
  const expLabel = experienceLevelLabel(job.experience_level);
  const title = jobTitle(job);
  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <article className="jobs-card group">
      <div className="jobs-card__shine" aria-hidden />

      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-6">
        {/* Company logo */}
        <button
          type="button"
          onClick={() => onOpen(job)}
          className="relative shrink-0 self-start transition-transform duration-200 group-hover:scale-[1.02]"
        >
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-sky-50 to-card shadow-sm ring-1 ring-black/[0.04] sm:h-16 sm:w-16">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7 text-sky-600/50" />
            )}
          </div>
          {trending && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 shadow-md ring-2 ring-card">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {/* Title block */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpen(job)}
                className="text-left font-display text-lg font-bold leading-snug tracking-tight text-foreground transition-colors hover:text-sky-700 sm:text-xl"
              >
                {title}
              </button>
              <p className="mt-1 text-sm font-semibold text-sky-700/90">{job.company_name || 'Company'}</p>
            </div>

            <div className="flex flex-wrap gap-1.5 sm:max-w-[220px] sm:justify-end">
              {trending && (
                <span className="jobs-badge jobs-badge--hot">
                  <TrendingUp className="h-3 w-3" />
                  Hot
                </span>
              )}
              {job.is_remote && <span className="jobs-badge jobs-badge--remote">Remote</span>}
              {typeLabel && <span className="jobs-badge jobs-badge--type">{typeLabel}</span>}
              {job.category && (
                <span className="jobs-badge jobs-badge--category">{categoryLabel(job.category)}</span>
              )}
            </div>
          </div>

          {/* Meta chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {job.location && <MetaItem icon={MapPin}>{job.location}</MetaItem>}
            {salary && <MetaItem icon={DollarSign} highlight>{salary}</MetaItem>}
            {expLabel && <MetaItem icon={GraduationCap}>{expLabel}</MetaItem>}
            {timeAgo && <MetaItem icon={Clock}>Posted {timeAgo}</MetaItem>}
            {deadline && <MetaItem icon={Calendar}>Apply by {deadline}</MetaItem>}
          </div>

          {/* Description */}
          {job.description?.trim() ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : null}

          {/* Footer */}
          <div className="mt-5 flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Users className="h-3.5 w-3.5 text-sky-600/70" />
                <span className="tabular-nums font-bold text-foreground">{job.applications_count ?? 0}</span>
                applicants
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Eye className="h-3.5 w-3.5" />
                <span className="tabular-nums font-semibold text-foreground">{job.views_count ?? 0}</span>
                views
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark(job.id);
                }}
                className={`jobs-icon-btn ${isBookmarked ? 'jobs-icon-btn--saved' : ''}`}
                aria-label={isBookmarked ? 'Remove saved job' : 'Save job'}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>

              {isOwner ? (
                <span className="jobs-pill jobs-pill--muted">Your listing</span>
              ) : isApplied ? (
                <span className="jobs-pill jobs-pill--success">
                  <CheckCircle2 className="h-4 w-4" />
                  Applied
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpen(job)}
                    className="jobs-btn jobs-btn--ghost"
                  >
                    View details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onApply(job)}
                    className="jobs-btn jobs-btn--primary"
                  >
                    {job.apply_url ? (
                      <>
                        Apply
                        <ExternalLink className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4" />
                        Easy Apply
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
