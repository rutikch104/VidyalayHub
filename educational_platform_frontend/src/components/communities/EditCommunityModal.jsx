// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Lock, Globe, Plus, Hash, Loader2 } from 'lucide-react';
import CommunityImageUpload from './CommunityImageUpload';
import { mediaOrFallback, FALLBACK_COVER, FALLBACK_AVATAR } from './communityUtils';

const MAX_NAME = 60;
const MAX_DESC = 240;
const MAX_TAGS = 8;
const MAX_RULES = 10;

function revokeIfBlob(url) {
  if (url && String(url).startsWith('blob:')) URL.revokeObjectURL(url);
}

export default function EditCommunityModal({
  open,
  community,
  onClose,
  onSubmit,
  submitting,
  categoryOptions = [],
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState('');
  const [rules, setRules] = useState(['']);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  useEffect(() => {
    if (!open || !community) return;
    setName(community.name || '');
    setDescription(community.description || '');
    setCategory(community.category || 'General');
    setIsPrivate(!!community.is_private);
    setTags(Array.isArray(community.tags) ? [...community.tags] : []);
    setTagDraft('');
    const communityRules = Array.isArray(community.rules) ? community.rules.filter(Boolean) : [];
    setRules(communityRules.length > 0 ? communityRules : ['']);
    setAvatarFile(null);
    setCoverFile(null);
    revokeIfBlob(avatarPreview);
    revokeIfBlob(coverPreview);
    setAvatarPreview(mediaOrFallback(community.avatar_url, FALLBACK_AVATAR));
    setCoverPreview(mediaOrFallback(community.cover_url, FALLBACK_COVER));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, community?.id]);

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

  useEffect(
    () => () => {
      revokeIfBlob(avatarPreview);
      revokeIfBlob(coverPreview);
    },
    [avatarPreview, coverPreview],
  );

  if (!open || !community) return null;

  const addTag = (raw) => {
    const t = String(raw || '')
      .trim()
      .replace(/^#/, '')
      .toLowerCase();
    if (!t || tags.includes(t) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, t]);
    setTagDraft('');
  };

  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const updateRule = (idx, val) => setRules((prev) => prev.map((r, i) => (i === idx ? val : r)));

  const addRuleRow = () => {
    if (rules.length >= MAX_RULES) return;
    setRules((prev) => [...prev, '']);
  };

  const removeRuleRow = (idx) => setRules((prev) => prev.filter((_, i) => i !== idx));

  const handleAvatarChange = (file) => {
    revokeIfBlob(avatarPreview);
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(mediaOrFallback(community.avatar_url, FALLBACK_AVATAR));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (file) => {
    revokeIfBlob(coverPreview);
    if (!file) {
      setCoverFile(null);
      setCoverPreview(mediaOrFallback(community.cover_url, FALLBACK_COVER));
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
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

  const categories = categoryOptions.filter((c) => c !== 'all');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-community-title"
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-2xl sm:max-h-[92vh] sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 sm:slide-in-from-bottom-0 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-5 py-4 sm:px-6">
          <div>
            <h2 id="edit-community-title" className="text-base font-semibold text-foreground">
              Edit community
            </h2>
            <p className="text-xs text-muted-foreground">
              Update details, branding, tags, and rules for {community.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-border/50 bg-muted/15 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Branding</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Update logo or background cover. Leave unchanged to keep current images.
            </p>
            <div className="mt-4 space-y-4">
              <CommunityImageUpload
                label="Background cover"
                hint="Wide banner · max 8 MB"
                previewUrl={coverPreview}
                onFileChange={handleCoverChange}
                disabled={submitting}
                uploading={submitting}
                imageRole="cover"
                variant="banner"
                optional
              />
              <CommunityImageUpload
                label="Community logo"
                hint="Square image · max 5 MB"
                previewUrl={avatarPreview}
                onFileChange={handleAvatarChange}
                disabled={submitting}
                uploading={submitting}
                imageRole="avatar"
                variant="compact"
                optional
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
              Community name
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {name.length}/{MAX_NAME}
              </span>
            </label>
            <input
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
              Description
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {description.length}/{MAX_DESC}
              </span>
            </label>
            <textarea
              value={description}
              maxLength={MAX_DESC}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {(categories.length ? categories : ['General']).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-foreground">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: false, icon: Globe, title: 'Public', desc: 'All colleges can discover & join' },
                { id: true, icon: Lock, title: 'Private', desc: 'Only your college members' },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = isPrivate === opt.id;
                return (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => setIsPrivate(opt.id)}
                    className={`group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-primary/50 bg-primary/[0.06] ring-1 ring-primary/20'
                        : 'border-border/60 bg-card hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground">{opt.title}</span>
                    <span className="text-[11px] leading-snug text-muted-foreground">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
              Tags
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {tags.length}/{MAX_TAGS}
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card px-2.5 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/[0.08] px-2 py-1 text-xs font-medium text-primary"
                >
                  <Hash className="h-3 w-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/15"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {tags.length < MAX_TAGS && (
                <input
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
                  placeholder={tags.length === 0 ? 'Add a tag…' : ''}
                  className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
              Rules
              <span className="text-[10px] font-medium text-muted-foreground/70">
                {rules.filter(Boolean).length}/{MAX_RULES}
              </span>
            </label>
            <div className="space-y-2">
              {rules.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <input
                    value={r}
                    onChange={(e) => updateRule(idx, e.target.value)}
                    placeholder="Community rule"
                    className="flex-1 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                  {rules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRuleRow(idx)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {rules.length < MAX_RULES && (
                <button
                  type="button"
                  onClick={addRuleRow}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/50 bg-muted/30 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !name.trim()}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
