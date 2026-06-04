// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Send, Loader2, ExternalLink } from 'lucide-react';
import { jobTitle } from './jobUtils';

export default function ApplyJobModal({ job, onClose, onSubmit }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState(null);
  const [linkedin, setLinkedin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const externalOnly = Boolean(job.apply_url) && !resume;

  const handleExternal = () => {
    window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleSubmit = async () => {
    if (job.apply_url && !resume && !coverLetter.trim()) {
      handleExternal();
      return;
    }
    if (!resume && !job.apply_url) {
      setError('Please upload a resume or use the external apply link.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        resume,
        cover_letter: coverLetter.trim(),
        linkedin_url: linkedin.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Application failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4">
          <h3 className="truncate pr-2 text-base font-semibold text-foreground">Apply — {jobTitle(job)}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {job.apply_url && (
            <button
              type="button"
              onClick={handleExternal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200 bg-sky-50 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-100"
            >
              <ExternalLink className="h-4 w-4" />
              Apply on company website
            </button>
          )}
          <div>
            <label className="text-sm font-medium">Resume {job.apply_url ? '(optional)' : '*'}</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="mt-1 w-full text-sm"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Cover letter</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
              placeholder="Why are you a great fit?"
            />
          </div>
          <div>
            <label className="text-sm font-medium">LinkedIn (optional)</label>
            <input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border/50 bg-muted/30 px-5 py-3.5">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {externalOnly && job.apply_url ? 'Continue' : 'Submit application'}
          </button>
        </div>
      </div>
    </div>
  );
}
