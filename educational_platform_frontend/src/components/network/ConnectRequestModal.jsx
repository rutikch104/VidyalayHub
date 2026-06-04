// @ts-nocheck
import { useEffect } from 'react';
import { X } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

export default function ConnectRequestModal({ person, message, onMessageChange, onClose, onSend, sending }) {
  useEffect(() => {
    if (!person) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [person, onClose]);

  if (!person) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm sm:items-center sm:p-4 transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[1.5rem] border border-border/40 bg-card/95 p-5 shadow-modal backdrop-blur-xl animate-fade-scale sm:rounded-[1.5rem] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Send invitation</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-6 flex items-center gap-4 rounded-[1.25rem] border border-border/40 bg-muted/30 p-4">
          <UserAvatar name={person.name} avatarUrl={person.avatar} size="lg" />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-bold text-foreground">{person.name}</h4>
            <p className="truncate text-xs font-medium text-primary">{person.title}</p>
            {person.college && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{person.college}</p>
            )}
          </div>
        </div>
        <div className="mb-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Personal note (optional)
          </label>
          <textarea
            placeholder="Hi! I'd like to connect and learn from your experience..."
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            className="w-full rounded-[1.25rem] border border-border/50 bg-muted/30 p-4 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-black/[0.01] transition-all focus:border-primary/60 focus:bg-card focus:outline-none focus:ring-[3px] focus:ring-primary/10 min-h-[120px] resize-none"
            rows={3}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-border/50 bg-muted/30 px-4 py-2.5 font-bold text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() => onSend(person.userId, message)}
            className="flex-1 rounded-full bg-gradient-to-br from-primary to-primary/90 px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition-all hover:scale-[1.02] hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
