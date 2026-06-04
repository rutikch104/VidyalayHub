import { GraduationCap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { EduTag } from '@/components/profile/eduConnect/primitives';
import { LovableEditButton } from '@/components/profile/lovable/LovableSectionCard';

export function ProfileEditAction({ onClick, label = 'Edit' }) {
  return <LovableEditButton onClick={onClick} label={label} />;
}

export function ProfileHashtagTags({ items = [] }) {
  const tags = (items || [])
    .map((t) => (typeof t === 'string' ? t : t?.name || t?.title || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (!tags.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((label) => {
        const text = label.startsWith('#') ? label : `#${label}`;
        return (
          <Badge key={text} variant="secondary" className="rounded-full bg-accent/60 text-accent-foreground">
            {text}
          </Badge>
        );
      })}
    </div>
  );
}

export function ProfileTeachingGrid({ items = [] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-border/80 hover:bg-muted/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{item.label}</p>
          <p className="mt-1.5 text-sm font-semibold tracking-tight text-foreground">{item.value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function ProfileSubjectBadges({ subjects = [] }) {
  const list = (subjects || []).map((s) => String(s).trim()).filter(Boolean);
  if (!list.length) {
    return <p className="text-sm leading-relaxed text-foreground/80">No subjects listed.</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {list.map((s) => (
        <Badge key={s} className="rounded-full border-0 bg-gradient-primary text-primary-foreground">
          {s}
        </Badge>
      ))}
    </div>
  );
}

export function ProfileMiniStatGrid({ items = [] }) {
  return <ProfileTeachingGrid items={items} />;
}

export function ProfileInstitutionBlock({ university, course, graduationYear }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-gradient-soft p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/[0.15] via-accent/10 to-primary/[0.08] text-primary ring-1 ring-primary/[0.15]">
        <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{university || 'Your institution'}</p>
        <p className="text-sm text-muted-foreground">{course || 'Program not set'}</p>
        {graduationYear ? <p className="mt-0.5 text-xs text-muted-foreground/70">Class of {graduationYear}</p> : null}
      </div>
    </div>
  );
}

export function ProfileEducationBlock({ degree, school, years }) {
  return (
    <div className="flex gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-border/70">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{degree || 'Degree'}</p>
        <p className="text-sm text-muted-foreground">{school || 'Institution'}</p>
        {years ? <p className="text-xs text-muted-foreground/80">{years}</p> : null}
      </div>
    </div>
  );
}

export function ProfileSubsection({ title, action, children, className }) {
  return (
    <div className={cn('mt-5', className)}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {title ? (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">{title}</p>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ProfileTagGroup({ items = [], emptyLabel = 'None listed yet.', color = 'blue' }) {
  const labels = (items || [])
    .map((item) => (typeof item === 'string' ? item : item?.name || item?.title || ''))
    .map((s) => String(s).trim())
    .filter(Boolean);
  if (!labels.length) return <p className="text-sm leading-relaxed text-foreground/80">{emptyLabel}</p>;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {labels.map((label) => (
        <EduTag key={label} color={color}>
          {label}
        </EduTag>
      ))}
    </div>
  );
}

export function ProfileCertList({ certs = [] }) {
  return (
    <ul className="space-y-2">
      {certs.map((c) => {
        const name = typeof c === 'string' ? c : c?.name;
        return (
          <li
            key={name}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 p-3.5 transition-colors hover:border-border/70 hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-600/10 text-violet-600 ring-1 ring-violet-200/60">
              <Award className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {typeof c === 'object' && c?.year ? `Issued ${c.year} · ` : ''}Verified
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
