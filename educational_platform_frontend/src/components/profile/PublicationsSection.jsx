import { FileText, ExternalLink, BookOpen, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EduSectionCard } from '@/components/profile/eduConnect/primitives';
import { ProfileEditAction } from '@/components/profile/eduConnect/profileLayoutParts';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';

export default function PublicationsSection({ publications = [], onEdit }) {
  return (
    <section id="profile-publications" className="scroll-mt-28">
      <EduSectionCard
        icon={FileText}
        title="Publications"
        subtitle="Research, papers, and academic work"
        action={<ProfileEditAction onClick={onEdit ? () => onEdit() : null} />}
      >
        {publications.length === 0 ? (
          <ProfileEmptyState
            icon={FileText}
            title="No publications yet"
            description="Add papers, articles, or posters to build an academic profile."
          />
        ) : (
          <ul className="space-y-3">
            {publications.map((p) => (
              <li
                key={p.id}
                className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-primary opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]" />

                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/[0.12] via-accent/10 to-primary/[0.08] text-primary ring-1 ring-primary/10 transition-colors group-hover:from-primary/[0.18]">
                  <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                </div>

                <div className="relative min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                      {p.title}
                    </h3>
                    {p.year ? (
                      <Badge
                        variant="secondary"
                        className="shrink-0 rounded-full text-[10px] font-semibold"
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        {p.year}
                      </Badge>
                    ) : null}
                  </div>

                  {p.venue ? (
                    <p className="mt-1 text-xs font-medium text-primary/80">{p.venue}</p>
                  ) : null}

                  {p.description ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  ) : null}

                  {p.url ? (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      View publication <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </EduSectionCard>
    </section>
  );
}
