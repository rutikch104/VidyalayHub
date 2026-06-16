// @ts-nocheck
import {
  MapPin,
  Bookmark,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  Briefcase,
  Users,
  Eye,
  ChevronRight,
  GraduationCap,
  Clock,
  Share2,
  Sparkles,
  IndianRupee,
  Home,
  BadgeCheck,
} from 'lucide-react';
import {
  jobTitle,
  companyLogoUrl,
  companyInitials,
  formatSalary,
  formatTimeAgo,
  formatCompactCount,
  categoryLabel,
  jobTypeLabel,
  experienceLevelLabel,
  workModeLabel,
  isJobNew,
} from './jobUtils';

function MetaPill({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`jobs-meta-pill${accent ? ' jobs-meta-pill--accent' : ''}`}>
      <span className="jobs-meta-pill__icon">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="jobs-meta-pill__text">
        <span className="jobs-meta-pill__label">{label}</span>
        <span className="jobs-meta-pill__value">{value}</span>
      </span>
    </div>
  );
}

function getStatusBadges(job, typeLabel, trending) {
  const badges = [];
  if (trending) badges.push({ key: 'hot', className: 'jobs-badge--hot', label: 'Hot', icon: TrendingUp });
  if (job.is_remote) badges.push({ key: 'remote', className: 'jobs-badge--remote', label: 'Remote' });
  if (typeLabel) badges.push({ key: 'type', className: 'jobs-badge--type', label: typeLabel });

  const catLabel = job.category ? categoryLabel(job.category) : null;
  const typeNorm = String(typeLabel || '').toLowerCase().replace(/[-_]/g, ' ');
  const catNorm = String(catLabel || '').toLowerCase().replace(/[-_]/g, ' ');
  const isDuplicate =
    catNorm &&
    (typeNorm === catNorm ||
      typeNorm.includes(catNorm) ||
      catNorm.includes(typeNorm) ||
      (typeNorm.includes('full') && catNorm.includes('full')));

  if (catLabel && !isDuplicate) {
    badges.push({ key: 'category', className: 'jobs-badge--category', label: catLabel });
  }

  return badges;
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
  const salary = formatSalary(job.salary_range) || 'Not disclosed';
  const timeAgo = formatTimeAgo(job.created_at);
  const typeLabel = jobTypeLabel(job.job_type);
  const expLabel = experienceLevelLabel(job.experience_level) || 'Not specified';
  const modeLabel = workModeLabel(job);
  const title = jobTitle(job);
  const skills = (job.skills_required || []).filter(Boolean).slice(0, 6);
  const isNew = isJobNew(job);
  const isCampus = job.category === 'campus';
  const statusBadges = getStatusBadges(job, typeLabel, trending);

  const deadline = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: job.company_name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  };

  return (
    <article className="jobs-card jobs-card--lovable group">
      <div className="jobs-card__glow" aria-hidden />
      <div className="jobs-card__glow jobs-card__glow--left" aria-hidden />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBookmark(job.id);
        }}
        className={`jobs-card__bookmark${isBookmarked ? ' jobs-card__bookmark--saved' : ''}`}
        aria-label={isBookmarked ? 'Remove saved job' : 'Save job'}
      >
        <Bookmark className={`h-4 w-4${isBookmarked ? ' fill-current' : ''}`} />
      </button>

      <div className="jobs-card__inner">
        <button type="button" onClick={() => onOpen(job)} className="jobs-card__logo-btn">
          <div className="jobs-card__logo">
            {logo ? (
              <img src={logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="jobs-card__logo-initials">{companyInitials(job.company_name)}</span>
            )}
          </div>
          {trending ? (
            <span className="jobs-card__trending-badge">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
        </button>

        <div className="jobs-card__content">
          <div className="jobs-card__header">
            <div className="jobs-card__identity">
              {(isNew || isCampus) && (
                <div className="jobs-card__highlight-badges">
                  {isNew ? (
                    <span className="jobs-badge jobs-badge--new">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      New
                    </span>
                  ) : null}
                  {isCampus ? (
                    <span className="jobs-badge jobs-badge--campus">
                      <GraduationCap className="h-3 w-3" aria-hidden />
                      Campus
                    </span>
                  ) : null}
                </div>
              )}

              <button type="button" onClick={() => onOpen(job)} className="jobs-card__title">
                {title}
              </button>

              <div className="jobs-card__company-row">
                <span className="jobs-card__company">{job.company_name || 'Company'}</span>
                <BadgeCheck className="jobs-card__verified h-3.5 w-3.5 shrink-0" aria-hidden />
                {job.location ? (
                  <>
                    <span className="jobs-card__dot" aria-hidden />
                    <span className="jobs-card__location">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {job.location}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {statusBadges.length > 0 ? (
              <div className="jobs-card__status-badges">
                {statusBadges.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <span key={badge.key} className={`jobs-badge ${badge.className}`}>
                      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
                      {badge.label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="jobs-card__meta-pills">
            <MetaPill icon={IndianRupee} label="Package" value={salary} accent />
            <MetaPill icon={Briefcase} label="Type" value={typeLabel || 'Not specified'} />
            <MetaPill icon={GraduationCap} label="Experience" value={expLabel} />
            <MetaPill icon={Home} label="Mode" value={modeLabel} />
          </div>

          {skills.length > 0 ? (
            <div className="jobs-card__skills">
              {skills.map((skill) => (
                <span key={skill} className="jobs-card__skill">
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          <div className="jobs-card__footer">
            <div className="jobs-card__stats-bar">
              <div className="jobs-card__stats">
                <span className="jobs-card__stat">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  <strong>{formatCompactCount(job.applications_count ?? 0)}</strong> applicants
                </span>
                <span className="jobs-card__stat">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  <strong>{formatCompactCount(job.views_count ?? 0)}</strong> views
                </span>
                {deadline ? (
                  <span className="jobs-card__stat jobs-card__stat--deadline">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    Apply by {deadline}
                  </span>
                ) : null}
              </div>
              {timeAgo ? <span className="jobs-card__posted">Posted {timeAgo}</span> : null}
            </div>

            <div className="jobs-card__actions">
              <button
                type="button"
                onClick={handleShare}
                className="jobs-card__share"
                aria-label="Share job"
              >
                <Share2 className="h-4 w-4" />
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
                  <button type="button" onClick={() => onOpen(job)} className="jobs-btn jobs-btn--ghost">
                    View details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onApply(job)} className="jobs-btn jobs-btn--primary">
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
