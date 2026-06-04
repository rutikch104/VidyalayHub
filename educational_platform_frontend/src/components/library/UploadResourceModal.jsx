// @ts-nocheck
import { useRef, useState, useEffect } from 'react';
import { X, Upload, Loader2, Globe, FileUp } from 'lucide-react';

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.mp4,.webm';

export default function UploadResourceModal({
  open,
  onClose,
  onSubmit,
  submitting,
  subjects,
  tagSuggestions,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('PDF');
  const [file, setFile] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const addTag = (tag) => {
    const t = String(tag).trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const applyFile = (nextFile) => {
    if (!nextFile) {
      setFile(null);
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = () => {
    onSubmit({ title, description, subject, type, file, tags });
  };

  return (
    <div className="lib-upload-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lib-upload-modal__dialog" onClick={(e) => e.stopPropagation()}>
        <div className="lib-upload-modal__header">
          <h2 className="lib-upload-modal__title">Upload to Library Central</h2>
          <button type="button" onClick={onClose} className="lib-upload-modal__close" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="lib-upload-modal__body">
          <div className="lib-upload-modal__notice">
            <span className="flex items-center gap-2 font-semibold">
              <Globe className="h-4 w-4 shrink-0" aria-hidden />
              Shared across all colleges
            </span>
            <p className="mt-1.5 leading-relaxed text-emerald-800/90">
              Your upload will be visible to students from every institution on the platform.
            </p>
          </div>

          <div className="lib-upload-modal__field">
            <label htmlFor="lib-upload-title" className="lib-upload-modal__label">
              Title *
            </label>
            <input
              id="lib-upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="lib-upload-modal__input"
              placeholder="e.g. Data Structures — Unit 3 Notes"
            />
          </div>

          <div className="lib-upload-modal__field">
            <label htmlFor="lib-upload-desc" className="lib-upload-modal__label">
              Description
            </label>
            <textarea
              id="lib-upload-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="lib-upload-modal__textarea"
              placeholder="Brief summary of what this resource covers…"
            />
          </div>

          <div className="lib-upload-modal__grid">
            <div className="lib-upload-modal__field">
              <label htmlFor="lib-upload-subject" className="lib-upload-modal__label">
                Subject *
              </label>
              <select
                id="lib-upload-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="lib-upload-modal__select"
              >
                <option value="">Select subject</option>
                {subjects.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="lib-upload-modal__field">
              <label htmlFor="lib-upload-type" className="lib-upload-modal__label">
                Type
              </label>
              <select
                id="lib-upload-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="lib-upload-modal__select"
              >
                {['PDF', 'DOC', 'PPT', 'VIDEO'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lib-upload-modal__field">
            <span className="lib-upload-modal__label">File *</span>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) applyFile(dropped);
              }}
              className={[
                'lib-upload-modal__dropzone',
                dragOver ? 'lib-upload-modal__dropzone--active' : '',
                file ? 'lib-upload-modal__dropzone--has-file' : '',
              ].join(' ')}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => applyFile(e.target.files?.[0] || null)}
                aria-label="Choose file to upload"
              />
              {file ? (
                <>
                  <FileUp className="h-8 w-8 text-emerald-600" aria-hidden />
                  <p className="lib-upload-modal__file-name">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Click or drop to replace</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-emerald-600" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, PPT, MP4 · max size per server limits</p>
                </>
              )}
            </div>
          </div>

          <div className="lib-upload-modal__field">
            <label htmlFor="lib-upload-tags" className="lib-upload-modal__label">
              Tags
            </label>
            <input
              id="lib-upload-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              className="lib-upload-modal__input"
              placeholder="Press Enter to add a tag"
            />
            {tagSuggestions.length > 0 ? (
              <div className="lib-upload-modal__tag-suggestions">
                {tagSuggestions.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="lib-upload-modal__tag-chip"
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}
            {tags.length > 0 ? (
              <div className="lib-upload-modal__tags">
                {tags.map((t) => (
                  <span key={t} className="lib-upload-modal__tag">
                    {t}
                    <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lib-upload-modal__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="lib-upload-modal__btn lib-upload-modal__btn--ghost sm:min-w-[7rem]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !title.trim() || !file || !subject}
            onClick={handleSubmit}
            className="lib-upload-modal__btn lib-upload-modal__btn--primary sm:min-w-[9rem]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" />}
            {submitting ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
