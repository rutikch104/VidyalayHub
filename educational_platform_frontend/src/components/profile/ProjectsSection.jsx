import { Code, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EduSectionCard } from '@/components/profile/eduConnect/primitives';
import { ProfileEditAction } from '@/components/profile/eduConnect/profileLayoutParts';
import ProfileEmptyState from '@/components/profile/premium/ProfileEmptyState';

function techColor(tech) {
  const t = String(tech).toLowerCase();
  if (t.includes('react') || t.includes('vue') || t.includes('svelte')) return 'text-sky-500';
  if (t.includes('python') || t.includes('django') || t.includes('flask')) return 'text-emerald-500';
  if (t.includes('node') || t.includes('express') || t.includes('next')) return 'text-green-500';
  if (t.includes('ai') || t.includes('ml') || t.includes('gpt')) return 'text-violet-500';
  if (t.includes('aws') || t.includes('cloud') || t.includes('docker')) return 'text-amber-500';
  return 'text-primary';
}

export default function ProjectsSection({ projects = [], onEdit }) {
  return (
    <section id="profile-projects" className="scroll-mt-28">
      <EduSectionCard
        icon={Code}
        title="Projects"
        subtitle="Work showcased on this profile"
        action={<ProfileEditAction onClick={onEdit ? () => onEdit() : null} />}
      >
        {projects.length === 0 ? (
          <ProfileEmptyState
            icon={Code}
            title="No projects yet"
            description="Add your first project to show off your work."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((p) => {
              const techColor1 = p.technologies?.length ? techColor(p.technologies[0]) : 'text-primary';
              return (
                <article
                  key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
                >
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 transition-opacity duration-300 group-hover:opacity-[0.03]" />
                  <div className="relative flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-sm transition-shadow group-hover:shadow-glow`}>
                      <Star className="h-4 w-4" />
                    </div>
                    {p.status ? (
                      <Badge variant="secondary" className="rounded-full text-[10px] font-semibold">
                        {p.status}
                      </Badge>
                    ) : null}
                  </div>

                  <h3 className="relative mt-3 text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {p.title}
                  </h3>
                  {p.description ? (
                    <p className="relative mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {p.description}
                    </p>
                  ) : null}

                  {p.technologies?.length ? (
                    <div className="relative mt-3 flex flex-wrap gap-1.5">
                      {p.technologies.map((t, i) => (
                        <span
                          key={i}
                          className={`rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold ${techColor(t)}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {(p.githubUrl || p.liveUrl) ? (
                    <div className="relative mt-3 flex gap-3 border-t border-border/40 pt-3">
                      {p.githubUrl ? (
                        <a
                          href={p.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          Repository <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      {p.liveUrl ? (
                        <a
                          href={p.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          Live demo <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </EduSectionCard>
    </section>
  );
}
