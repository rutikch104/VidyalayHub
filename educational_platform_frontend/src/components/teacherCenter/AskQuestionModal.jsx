// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import TeacherTagPicker from './TeacherTagPicker';

const EMPTY = {
  title: '',
  description: '',
  tags: [],
  tagInput: '',
  is_anonymous: false,
  taggedTeachers: [],
};

export default function AskQuestionModal({ open, onClose, onSubmit, popularTags = [] }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  if (!open) return null;

  const addTagFromInput = () => {
    const t = form.tagInput.trim().replace(/^#/, '');
    if (!t || form.tags.includes(t)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t], tagInput: '' }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        tags: form.tags,
        is_anonymous: form.is_anonymous,
        mentioned_users: form.taggedTeachers.map((t) => t.id),
      });
      setForm(EMPTY);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tc-ask-modal" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="tc-ask-title">
      <div className="tc-ask-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <header className="tc-ask-modal__header">
          <div className="flex min-w-0 items-center gap-2.5">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-600" aria-hidden />
            <h2 id="tc-ask-title" className="tc-ask-modal__title">Ask the global community</h2>
          </div>
          <button type="button" onClick={onClose} className="tc-ask-modal__close" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="tc-ask-modal__body">
          <div className="tc-ask-modal__field">
            <label htmlFor="tc-ask-title-input" className="tc-ask-modal__label">Question title *</label>
            <input
              id="tc-ask-title-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="tc-ask-modal__input"
              placeholder="Be specific — what do you need help with?"
            />
          </div>
          <div className="tc-ask-modal__field">
            <label htmlFor="tc-ask-desc" className="tc-ask-modal__label">Details *</label>
            <textarea
              id="tc-ask-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={5}
              className="tc-ask-modal__textarea"
              placeholder="Share context, what you tried, and what you expect…"
            />
          </div>

          <TeacherTagPicker
            selected={form.taggedTeachers}
            onChange={(taggedTeachers) => setForm((f) => ({ ...f, taggedTeachers }))}
          />

          <div className="tc-ask-modal__field">
            <label htmlFor="tc-ask-tags" className="tc-ask-modal__label">Tags</label>
            <div className="flex gap-2">
              <input
                id="tc-ask-tags"
                value={form.tagInput}
                onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTagFromInput())}
                className="tc-ask-modal__input min-w-0 flex-1"
                placeholder="Add a topic tag"
              />
              <button type="button" onClick={addTagFromInput} className="tc-ask-modal__add-tag">
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}
                    className="tc-q-card__tag"
                  >
                    #{tag} ×
                  </button>
                ))}
              </div>
            )}
            {popularTags.length > 0 && (
              <div className="tc-ask-modal__tag-suggestions">
                {popularTags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      !form.tags.includes(tag) && setForm((f) => ({ ...f, tags: [...f.tags, tag] }))
                    }
                    className="tc-ask-modal__tag-chip"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="tc-ask-modal__checkbox">
            <input
              type="checkbox"
              checked={form.is_anonymous}
              onChange={(e) => setForm((f) => ({ ...f, is_anonymous: e.target.checked }))}
              className="rounded border-border text-violet-600"
            />
            Post anonymously
          </label>

          {error ? (
            <div className="tc-ask-modal__error" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="tc-ask-modal__footer">
          <button type="button" onClick={onClose} className="tc-ask-modal__btn tc-ask-modal__btn--ghost">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="tc-ask-modal__btn tc-ask-modal__btn--primary"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" />}
            Post question
          </button>
        </footer>
      </div>
    </div>
  );
}
