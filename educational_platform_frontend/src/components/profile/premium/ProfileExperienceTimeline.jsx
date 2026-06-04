export default function ProfileExperienceTimeline({ items = [] }) {
  if (!items.length) {
    return <p className="text-sm leading-relaxed text-foreground/80">No experience listed yet.</p>;
  }

  return (
    <ol className="relative space-y-6 border-l-2 border-border/30 pl-6">
      {items.map((ex) => (
        <li key={ex.id || `${ex.title}-${ex.company}`} className="group relative">
          <span
            className="absolute -left-[1.1875rem] top-1 h-4 w-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm ring-2 ring-background"
            aria-hidden
          />
          <p className="text-sm font-semibold leading-snug text-foreground">{ex.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ex.company || '—'}
          </p>
          {(ex.duration || ex.location) ? (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {[ex.duration, ex.location].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          {ex.description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{ex.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
