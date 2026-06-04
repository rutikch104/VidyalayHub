// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { X, Lock, Globe, Plus, Hash, Loader2, Users, ChevronDown, AlertCircle } from 'lucide-react';
import CommunityImageUpload from './CommunityImageUpload';

const MAX_NAME = 60;
const MAX_DESC = 240;
const MAX_TAGS = 8;
const MAX_RULES = 10;

export default function CreateCommunityModal({
  open,
  onClose,
  onSubmit,
  submitting,
  categoryOptions,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');
  const [rules, setRules] = useState(['']);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const nameRef = useRef(null);
  const dialogRef = useRef(null);

  const nameError = nameTouched && !name.trim() ? 'Community name is required.' : '';
  const canSubmit = !!name.trim() && !submitting;

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('General');
    setIsPrivate(false);
    setTags([]);
    setTagDraft('');
    setRules(['']);
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview('');
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview('');
    setNameTouched(false);
  };

  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 80);
    if (!open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAvatarChange = (file) => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview('');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (file) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (!file) {
      setCoverFile(null);
      setCoverPreview('');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const addTag = (raw) => {
    const t = String(raw || '').trim().replace(/^#/, '').toLowerCase();
    if (!t || tags.includes(t) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, t]);
    setTagDraft('');
  };

  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const updateRule = (idx, val) =>
    setRules((prev) => prev.map((r, i) => (i === idx ? val : r)));

  const addRuleRow = () => {
    if (rules.length >= MAX_RULES) return;
    setRules((prev) => [...prev, '']);
  };

  const removeRuleRow = (idx) =>
    setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setNameTouched(true);
    if (!name.trim()) {
      nameRef.current?.focus();
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      category: category || 'General',
      is_private: isPrivate,
      tags,
      rules: rules.map((r) => r.trim()).filter(Boolean),
      avatarFile: avatarFile || null,
      coverFile: coverFile || null,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-community-title"
      aria-describedby="create-community-desc"
      className="comm-create-modal"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="comm-create-modal__dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="comm-create-modal__header">
          <span className="comm-create-modal__header-accent" aria-hidden />
          <div className="comm-create-modal__header-row">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="comm-create-modal__header-icon" aria-hidden>
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="create-community-title" className="comm-create-modal__title">
                  Create a community
                </h2>
                <p id="create-community-desc" className="comm-create-modal__subtitle">
                  Bring people together around a shared interest.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="comm-create-modal__close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="comm-create-modal__body">
          {/* Branding hero */}
          <section className="comm-create-modal__section" aria-labelledby="create-branding-heading">
            <div className="comm-create-modal__section-head">
              <h3 id="create-branding-heading" className="comm-create-modal__section-title">
                Branding
              </h3>
              <p className="comm-create-modal__section-desc">
                Optional cover and logo. Defaults are used until you upload your own.
              </p>
            </div>

            <div className="comm-create-modal__brand">
              <div className="comm-create-modal__brand-cover">
                <CommunityImageUpload
                  label="Background cover"
                  hint="Wide banner · JPEG, PNG, WebP or GIF · max 8 MB"
                  previewUrl={coverPreview}
                  onFileChange={handleCoverChange}
                  disabled={submitting}
                  uploading={submitting}
                  imageRole="cover"
                  variant="banner"
                  optional
                />
              </div>
              <div className="comm-create-modal__brand-logo">
                <CommunityImageUpload
                  label="Community logo"
                  hint="Square · max 5 MB"
                  previewUrl={avatarPreview}
                  onFileChange={handleAvatarChange}
                  disabled={submitting}
                  uploading={submitting}
                  imageRole="avatar"
                  variant="avatar"
                  optional
                  hideLabel
                />
              </div>
              <div className="comm-create-modal__brand-spacer" aria-hidden />
            </div>
          </section>

          {/* Basic details */}
          <section className="comm-create-modal__section" aria-labelledby="create-details-heading">
            <div className="comm-create-modal__section-head">
              <h3 id="create-details-heading" className="comm-create-modal__section-title">
                Basic details
              </h3>
            </div>

            <div className="space-y-4">
              <div className="comm-create-modal__field">
                <div className="comm-create-modal__label-row">
                  <label htmlFor="community-name" className="comm-create-modal__label">
                    Community name
                  </label>
                  <span className="comm-create-modal__counter">
                    {name.length}/{MAX_NAME}
                  </span>
                </div>
                <input
                  id="community-name"
                  ref={nameRef}
                  value={name}
                  maxLength={MAX_NAME}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  placeholder="e.g. Robotics Club"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'community-name-error' : undefined}
                  className={[
                    'comm-create-modal__input',
                    nameError ? 'comm-create-modal__input--error' : '',
                  ].join(' ')}
                />
                {nameError ? (
                  <p id="community-name-error" className="comm-create-modal__error" role="alert">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {nameError}
                  </p>
                ) : (
                  <p className="comm-create-modal__hint">Choose a clear name members will recognize.</p>
                )}
              </div>

              <div className="comm-create-modal__field">
                <div className="comm-create-modal__label-row">
                  <label htmlFor="community-description" className="comm-create-modal__label">
                    Description
                  </label>
                  <span className="comm-create-modal__counter">
                    {description.length}/{MAX_DESC}
                  </span>
                </div>
                <textarea
                  id="community-description"
                  value={description}
                  maxLength={MAX_DESC}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What is this community about?"
                  className="comm-create-modal__textarea"
                />
              </div>

              <div className="comm-create-modal__field">
                <label htmlFor="community-category" className="comm-create-modal__label">
                  Category
                </label>
                <div className="comm-create-modal__select-wrap">
                  <select
                    id="community-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="comm-create-modal__select"
                  >
                    {categoryOptions
                      .filter((c) => c !== 'all')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="comm-create-modal__select-icon" aria-hidden />
                </div>
              </div>
            </div>
          </section>

          {/* Visibility */}
          <section className="comm-create-modal__section" aria-labelledby="create-visibility-heading">
            <div className="comm-create-modal__section-head">
              <h3 id="create-visibility-heading" className="comm-create-modal__section-title">
                Visibility
              </h3>
              <p className="comm-create-modal__section-desc">
                Control who can discover and join your community.
              </p>
            </div>
            <div className="comm-create-modal__visibility" role="radiogroup" aria-label="Community visibility">
              {[
                {
                  id: false,
                  icon: Globe,
                  title: 'Public',
                  desc: 'All colleges can discover & join',
                },
                {
                  id: true,
                  icon: Lock,
                  title: 'Private',
                  desc: 'Only your college members',
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = isPrivate === opt.id;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setIsPrivate(opt.id)}
                    className={[
                      'comm-create-modal__visibility-card',
                      active ? 'comm-create-modal__visibility-card--active' : '',
                    ].join(' ')}
                  >
                    <span className="comm-create-modal__visibility-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="comm-create-modal__visibility-title">{opt.title}</span>
                    <span className="comm-create-modal__visibility-desc">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tags */}
          <section className="comm-create-modal__section" aria-labelledby="create-tags-heading">
            <div className="comm-create-modal__field">
              <div className="comm-create-modal__label-row">
                <label id="create-tags-heading" htmlFor="community-tags" className="comm-create-modal__label">
                  Tags
                </label>
                <span className="comm-create-modal__counter">
                  {tags.length}/{MAX_TAGS}
                </span>
              </div>
              <div className="comm-create-modal__tags">
                {tags.map((t) => (
                  <span key={t} className="comm-create-modal__tag">
                    <Hash className="h-3 w-3" aria-hidden />
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove tag ${t}`}
                      className="comm-create-modal__tag-remove"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                {tags.length < MAX_TAGS && (
                  <input
                    id="community-tags"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addTag(tagDraft);
                      }
                      if (e.key === 'Backspace' && !tagDraft && tags.length) {
                        setTags((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={() => tagDraft && addTag(tagDraft)}
                    placeholder={tags.length === 0 ? 'Add a tag and press Enter…' : 'Add another…'}
                    className="comm-create-modal__tag-input"
                  />
                )}
              </div>
              <p className="comm-create-modal__hint">Press Enter or comma to add a tag.</p>
            </div>
          </section>

          {/* Rules */}
          <section className="comm-create-modal__section" aria-labelledby="create-rules-heading">
            <div className="comm-create-modal__field">
              <div className="comm-create-modal__label-row">
                <span id="create-rules-heading" className="comm-create-modal__label">
                  Community rules
                </span>
                <span className="comm-create-modal__counter">
                  {rules.filter(Boolean).length}/{MAX_RULES}
                </span>
              </div>
              <div className="space-y-2.5">
                {rules.map((r, idx) => (
                  <div key={idx} className="comm-create-modal__rule-row">
                    <span className="comm-create-modal__rule-num" aria-hidden>
                      {idx + 1}
                    </span>
                    <input
                      value={r}
                      onChange={(e) => updateRule(idx, e.target.value)}
                      placeholder="Be respectful, no spam, etc."
                      aria-label={`Rule ${idx + 1}`}
                      className="comm-create-modal__rule-input"
                    />
                    {rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRuleRow(idx)}
                        aria-label={`Remove rule ${idx + 1}`}
                        className="comm-create-modal__rule-remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {rules.length < MAX_RULES && (
                  <button type="button" onClick={addRuleRow} className="comm-create-modal__add-btn">
                    <Plus className="h-3.5 w-3.5" />
                    Add rule
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="comm-create-modal__footer">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="comm-create-modal__btn comm-create-modal__btn--ghost sm:min-w-[7rem]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="comm-create-modal__btn comm-create-modal__btn--primary sm:min-w-[10rem]"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {submitting ? 'Creating…' : 'Create community'}
          </button>
        </footer>
      </div>
    </div>
  );
}
