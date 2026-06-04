// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import userService from '@/services/userService';
import SkillAutocomplete from '@/components/profile/SkillAutocomplete';
import ExperienceDateFields from '@/components/profile/ExperienceDateFields';
import EducationDateFields from '@/components/profile/EducationDateFields';
import { SkillChip } from '@/components/profile/premium/ProfileSkillsGrid';
import {
  buildExperienceDatePayload,
  emptyExperienceDateForm,
  experienceRowToDateForm,
  validateExperienceDates,
} from '@/components/profile/experienceDates';
import { ProfileExperienceEntry } from '@/components/profile/premium/ProfileExperienceTimeline';
import { ProfileEducationEntry } from '@/components/profile/premium/ProfileEducationList';
import {
  buildEducationDatePayload,
  emptyEducationDateForm,
  educationRowToDateForm,
  validateEducationDates,
} from '@/components/profile/educationDates';
import {
  PROFILE_ABOUT_MAX_CHARS,
  PROFILE_SKILLS_MAX,
  clampAboutText,
  formatAboutCharCount,
  isAboutAtLimit,
  isSkillsAtLimit,
  formatSkillsCount,
} from '@/components/profile/profileLimits';

const inputClass =
  'w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const labelClass = 'mb-1.5 block text-xs font-semibold text-muted-foreground';

function FieldError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function EntryActions({ onEdit, onDelete, loading, alwaysVisible = false }) {
  return (
    <div
      className={cn(
        'flex shrink-0 gap-1',
        alwaysVisible
          ? 'opacity-100'
          : 'opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100',
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onDelete}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddPanel({ label, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
      {children}
    </div>
  );
}

function ModalShell({ title, children, onClose, footer }) {
  const dialogRef = useRef(null);

  // Focus trap + Escape key handler
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusable = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => [...el.querySelectorAll(focusable)].filter((n) => !n.disabled);
    const first = getFocusable()[0];
    first?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (!items.length) return;
      const last = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === items[0]) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-gradient-to-r from-primary via-primary/60 to-accent/80" />
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-px bg-border/50" />
        <div className="max-h-[65vh] overflow-y-auto p-6">{children}</div>
        {footer ? (
          <>
            <div className="h-px bg-border/50" />
            <div className="px-6 py-4">{footer}</div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onSave, loading, saveLabel = 'Save changes', cancelLabel = 'Cancel' }) {
  return (
    <div className="flex justify-end gap-2.5">
      <button type="button" className="app-btn-secondary" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="button" className="app-btn-primary" disabled={loading} onClick={onSave}>
        {loading ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

export default function ProfileSectionEditModals({
  section,
  profileData,
  userProjects = [],
  userPublications = [],
  onClose,
  onSaved,
}) {
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const [aboutForm, setAboutForm] = useState({ bio: '' });
  const [expForm, setExpForm] = useState({
    title: '',
    company: '',
    description: '',
    ...emptyExperienceDateForm(),
  });
  const [expDateErrors, setExpDateErrors] = useState({});
  const [editExpId, setEditExpId] = useState(null);
  const [eduForm, setEduForm] = useState({
    institution_name: '',
    degree: '',
    field_of_study: '',
    cgpa: '',
    percentage: '',
    description: '',
    achievements: '',
    ...emptyEducationDateForm(),
  });
  const [eduDateErrors, setEduDateErrors] = useState({});
  const [editEduId, setEditEduId] = useState(null);
  const [achForm, setAchForm] = useState({ title: '', description: '' });
  const [editAchId, setEditAchId] = useState(null);
  const [skillName, setSkillName] = useState('');
  const [skillQuery, setSkillQuery] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [editSkillId, setEditSkillId] = useState(null);
  const [teachForm, setTeachForm] = useState({ subjectsText: '', experience_years: '', notes: '' });
  const [projForm, setProjForm] = useState({
    title: '',
    description: '',
    technologies: '',
    github_url: '',
    live_url: '',
    status: 'Completed',
  });
  const [editProjId, setEditProjId] = useState(null);
  const [pubForm, setPubForm] = useState({ title: '', venue: '', year: '', description: '', url: '' });
  const [editPubId, setEditPubId] = useState(null);

  // Reset all per-section edit state whenever the active section changes
  // (including close → null). Without this, leaving an edit half-done in
  // one section leaves the form/edit-ID populated when the section is
  // reopened, showing "Update" with stale values instead of "Add".
  useEffect(() => {
    setErr('');
    setEditExpId(null);
    setExpForm({ title: '', company: '', description: '', ...emptyExperienceDateForm() });
    setExpDateErrors({});
    setEditEduId(null);
    setEduForm({
      institution_name: '',
      degree: '',
      field_of_study: '',
      cgpa: '',
      percentage: '',
      description: '',
      achievements: '',
      ...emptyEducationDateForm(),
    });
    setEduDateErrors({});
    setEditAchId(null);
    setAchForm({ title: '', description: '' });
    setEditSkillId(null);
    setSkillName('');
    setSkillQuery('');
    setSkillLevel('');
    setEditProjId(null);
    setProjForm({ title: '', description: '', technologies: '', github_url: '', live_url: '', status: 'Completed' });
    setEditPubId(null);
    setPubForm({ title: '', venue: '', year: '', description: '', url: '' });
  }, [section]);

  // Hydrate forms for sections that present a single-form (not list+add) editor.
  useEffect(() => {
    if (!profileData) return;
    if (section === 'about') {
      setAboutForm({
        bio: profileData.bio || '',
      });
    }
    if (section === 'teaching' && profileData.teachingInfo) {
      const ti = profileData.teachingInfo;
      setTeachForm({
        subjectsText: Array.isArray(ti.subjects) ? ti.subjects.join('\n') : '',
        experience_years: ti.experience_years != null ? String(ti.experience_years) : '',
        notes: ti.notes || '',
      });
    }
  }, [section, profileData]);

  const saveAbout = async () => {
    const bio = clampAboutText(aboutForm.bio).trim();
    if (bio.length > PROFILE_ABOUT_MAX_CHARS) {
      setErr(`About cannot exceed ${PROFILE_ABOUT_MAX_CHARS.toLocaleString()} characters.`);
      return;
    }
    setLoading(true);
    setErr('');
    try {
      await userService.updateProfileAbout({
        bio,
      });
      await onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const resetExpForm = () => {
    setExpForm({ title: '', company: '', description: '', ...emptyExperienceDateForm() });
    setExpDateErrors({});
  };

  const addExperience = async () => {
    if (!expForm.title.trim()) {
      setErr('Title is required.');
      return;
    }
    const dateValidation = validateExperienceDates(expForm);
    if (!dateValidation.valid) {
      setExpDateErrors(dateValidation.errors);
      setErr(dateValidation.message);
      return;
    }
    setExpDateErrors({});
    setLoading(true);
    setErr('');
    try {
      const datePayload = buildExperienceDatePayload(expForm);
      const payload = {
        title: expForm.title.trim(),
        company: expForm.company.trim(),
        description: expForm.description.trim(),
        ...datePayload,
      };
      if (editExpId) {
        await userService.updateProfileExperience(editExpId, payload);
        setEditExpId(null);
      } else {
        await userService.addProfileExperience(payload);
      }
      resetExpForm();
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const delExp = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProfileExperience(id);
      if (editExpId === id) {
        setEditExpId(null);
        resetExpForm();
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const resetEduForm = () => {
    setEduForm({
      institution_name: '',
      degree: '',
      field_of_study: '',
      cgpa: '',
      percentage: '',
      description: '',
      achievements: '',
      ...emptyEducationDateForm(),
    });
    setEduDateErrors({});
  };

  const addEducation = async () => {
    if (!eduForm.institution_name.trim()) {
      setErr('Institution name is required.');
      return;
    }
    const dateValidation = validateEducationDates(eduForm);
    if (!dateValidation.valid) {
      setEduDateErrors(dateValidation.errors);
      setErr(dateValidation.message);
      return;
    }
    setEduDateErrors({});
    setLoading(true);
    setErr('');
    try {
      const payload = {
        institution_name: eduForm.institution_name.trim(),
        degree: eduForm.degree.trim(),
        field_of_study: eduForm.field_of_study.trim(),
        cgpa: eduForm.cgpa.trim(),
        percentage: eduForm.percentage.trim(),
        description: eduForm.description.trim(),
        achievements: eduForm.achievements.trim(),
        ...buildEducationDatePayload(eduForm),
      };
      if (editEduId) {
        await userService.updateProfileEducation(editEduId, payload);
        setEditEduId(null);
      } else {
        await userService.addProfileEducation(payload);
      }
      resetEduForm();
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const delEdu = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProfileEducation(id);
      if (editEduId === id) {
        setEditEduId(null);
        resetEduForm();
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditEdu = (row) => {
    setEditEduId(row.id);
    setEduDateErrors({});
    setEduForm({
      institution_name: row.institution_name || row.school || '',
      degree: row.degree || '',
      field_of_study: row.field_of_study || '',
      cgpa: row.cgpa || '',
      percentage: row.percentage || '',
      description: row.description || '',
      achievements: row.achievements || '',
      ...educationRowToDateForm(row),
    });
  };

  const startEditExp = (row) => {
    setEditExpId(row.id);
    setExpDateErrors({});
    setExpForm({
      title: row.title || '',
      company: row.company || '',
      description: row.description || '',
      ...experienceRowToDateForm(row),
    });
  };

  const addAchievement = async () => {
    if (!achForm.title.trim()) { setErr('Title is required.'); return; }
    setLoading(true);
    setErr('');
    try {
      if (editAchId) {
        await userService.updateProfileAchievement(editAchId, {
          title: achForm.title.trim(),
          description: achForm.description.trim(),
        });
        setEditAchId(null);
      } else {
        await userService.addProfileAchievement({
          title: achForm.title.trim(),
          description: achForm.description.trim(),
        });
      }
      setAchForm({ title: '', description: '' });
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const delAch = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProfileAchievement(id);
      if (editAchId === id) {
        setEditAchId(null);
        setAchForm({ title: '', description: '' });
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditAch = (row) => {
    const id = typeof row === 'string' ? null : row.id;
    const title = typeof row === 'string' ? row : row.title || '';
    const description = typeof row === 'string' ? '' : row.description || '';
    if (!id) return;
    setEditAchId(id);
    setAchForm({ title, description });
  };

  const addSkill = async (pick) => {
    const skillRowsNow = profileData?.professionalInfo?.skillsDetailed || [];

    if (editSkillId) {
      if (!skillName.trim()) {
        setErr('Skill name is required.');
        return;
      }
      setLoading(true);
      setErr('');
      try {
        const lvl = skillLevel.trim() === '' ? undefined : parseInt(skillLevel, 10);
        if (lvl != null && (Number.isNaN(lvl) || lvl < 0 || lvl > 10)) {
          setErr('Rating must be between 0 and 10.');
          setLoading(false);
          return;
        }
        await userService.updateProfileSkill(editSkillId, { skill_name: skillName.trim(), level: lvl });
        setEditSkillId(null);
        setSkillName('');
        setSkillLevel('');
        await onSaved?.();
      } catch (e) {
        setErr(e?.message || 'Save failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    const payload = pick || { skill_name: skillQuery.trim() };
    if (!payload.skill_name?.trim() && !payload.skill_id) {
      setErr('Select a skill from suggestions or create a new one.');
      return;
    }
    if (skillRowsNow.length >= PROFILE_SKILLS_MAX) {
      setErr('Maximum 10 skills allowed.');
      return;
    }

    setLoading(true);
    setErr('');
    try {
      await userService.addProfileSkill({
        skill_id: payload.skill_id,
        skill_name: payload.skill_name?.trim(),
      });
      setSkillQuery('');
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditSkill = (row) => {
    setEditSkillId(row.id);
    setSkillName(row.name || '');
    setSkillLevel(row.level != null && row.level !== '' ? String(row.level) : '');
  };

  const delSkill = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProfileSkill(id);
      if (editSkillId === id) {
        setEditSkillId(null);
        setSkillName('');
        setSkillLevel('');
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const parseTechList = (raw) =>
    String(raw || '').split(/[,|\n]/).map((s) => s.trim()).filter(Boolean);

  const saveProject = async () => {
    if (!projForm.title.trim()) { setErr('Title is required.'); return; }
    setLoading(true);
    setErr('');
    try {
      const payload = {
        title: projForm.title.trim(),
        description: projForm.description.trim(),
        technologies: parseTechList(projForm.technologies),
        github_url: projForm.github_url.trim() || undefined,
        live_url: projForm.live_url.trim() || undefined,
        status: projForm.status.trim() || 'Completed',
      };
      if (editProjId) {
        await userService.updateProject(editProjId, payload);
        setEditProjId(null);
      } else {
        await userService.addProject(payload);
      }
      setProjForm({ title: '', description: '', technologies: '', github_url: '', live_url: '', status: 'Completed' });
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const delProject = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProject(id);
      if (editProjId === id) {
        setEditProjId(null);
        setProjForm({ title: '', description: '', technologies: '', github_url: '', live_url: '', status: 'Completed' });
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditProj = (p) => {
    setEditProjId(p.id);
    setProjForm({
      title: p.title || '',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : '',
      github_url: p.githubUrl || p.github_url || '',
      live_url: p.liveUrl || p.live_url || '',
      status: p.status || 'Completed',
    });
  };

  const savePublication = async () => {
    if (!pubForm.title.trim()) { setErr('Title is required.'); return; }
    const yearStr = pubForm.year.trim();
    if (yearStr && !/^\d{4}$/.test(yearStr)) { setErr('Year must be a 4-digit number (e.g. 2024).'); return; }
    setLoading(true);
    setErr('');
    try {
      const payload = {
        title: pubForm.title.trim(),
        venue: pubForm.venue.trim(),
        year: yearStr ? parseInt(yearStr, 10) : undefined,
        description: pubForm.description.trim(),
        url: pubForm.url.trim(),
      };
      if (editPubId) {
        await userService.updateProfilePublication(editPubId, payload);
        setEditPubId(null);
      } else {
        await userService.addProfilePublication(payload);
      }
      setPubForm({ title: '', venue: '', year: '', description: '', url: '' });
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const delPublication = async (id) => {
    setLoading(true);
    setErr('');
    try {
      await userService.deleteProfilePublication(id);
      if (editPubId === id) {
        setEditPubId(null);
        setPubForm({ title: '', venue: '', year: '', description: '', url: '' });
      }
      await onSaved?.();
    } catch (e) {
      setErr(e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditPub = (p) => {
    setEditPubId(p.id);
    setPubForm({
      title: p.title || '',
      venue: p.venue || '',
      year: p.year != null ? String(p.year) : '',
      description: p.description || '',
      url: p.url || '',
    });
  };

  const saveTeaching = async () => {
    setLoading(true);
    setErr('');
    try {
      const subjects = teachForm.subjectsText
        .split(/\n|,/).map((s) => s.trim()).filter(Boolean);
      await userService.updateProfileTeachingInfo({
        subjects,
        experience_years: teachForm.experience_years.trim() === '' ? null : teachForm.experience_years.trim(),
        notes: teachForm.notes.trim(),
      });
      await onSaved?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (!section) return null;
  if (section !== 'projects' && section !== 'publications' && !profileData) return null;

  const list = profileData?.professionalInfo?.experienceList || [];
  const eduList = profileData?.educationList || [];
  const achList = profileData?.achievements || [];
  const skillRows = profileData?.professionalInfo?.skillsDetailed || [];

  /* ── About ── */
  if (section === 'about') {
    const aboutLen = aboutForm.bio.length;
    const aboutAtLimit = isAboutAtLimit(aboutLen);

    return (
      <ModalShell
        title="Edit about"
        onClose={onClose}
        footer={
          <ModalFooter
            onCancel={onClose}
            onSave={() => void saveAbout()}
            loading={loading}
          />
        }
      >
        <FieldError message={err} />
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="profile-about-bio">
              About
            </label>
            <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
              Write a clear introduction about who you are, what you do, and what you care about.
            </p>
            <textarea
              id="profile-about-bio"
              className={cn(
                inputClass,
                'min-h-[160px] resize-y leading-relaxed',
                aboutAtLimit && 'border-destructive/50 focus:border-destructive focus:ring-destructive/20',
              )}
              value={aboutForm.bio}
              maxLength={PROFILE_ABOUT_MAX_CHARS}
              onChange={(e) => setAboutForm({ bio: clampAboutText(e.target.value) })}
              placeholder="e.g. Passionate about building scalable solutions and turning ideas into reality…"
              rows={6}
              aria-describedby="profile-about-counter"
            />
            <div id="profile-about-counter" className="premium-profile-about-counter" aria-live="polite">
              <span
                className={cn(
                  'premium-profile-about-counter__text',
                  aboutAtLimit && 'premium-profile-about-counter__text--limit',
                )}
              >
                {formatAboutCharCount(aboutLen)}
              </span>
              {aboutAtLimit ? (
                <span className="premium-profile-about-counter__message">
                  Maximum {PROFILE_ABOUT_MAX_CHARS.toLocaleString()} characters reached.
                </span>
              ) : null}
            </div>
          </div>
          <p className="rounded-xl border border-border/50 bg-muted/25 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
            Manage your skills from the <span className="font-semibold text-foreground">Skills</span> section on your profile.
          </p>
        </div>
      </ModalShell>
    );
  }

  /* ── Education ── */
  if (section === 'education') {
    return (
      <ModalShell title="Education" onClose={onClose}>
        <FieldError message={err} />
        {eduList.length > 0 ? (
          <div className="premium-profile-education-list premium-profile-education-list--modal mb-5">
            {eduList.map((row) => (
              <ProfileEducationEntry
                key={row.id}
                edu={row}
                compactDescription
                className="premium-profile-education-card--modal"
                actions={(
                  <EntryActions
                    alwaysVisible
                    onEdit={() => startEditEdu(row)}
                    onDelete={() => void delEdu(row.id)}
                    loading={loading}
                  />
                )}
              />
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No education entries yet. Add your first below.</p>
        )}

        <AddPanel label={editEduId ? 'Update education' : 'Add education'}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>School / Institution *</label>
              <input
                className={inputClass}
                placeholder="e.g. R. C. Patel Institute of Technology"
                value={eduForm.institution_name}
                onChange={(e) => setEduForm({ ...eduForm, institution_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Degree</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Bachelor of Technology"
                  value={eduForm.degree}
                  onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Field of study</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Computer Engineering"
                  value={eduForm.field_of_study}
                  onChange={(e) => setEduForm({ ...eduForm, field_of_study: e.target.value })}
                />
              </div>
            </div>
            <EducationDateFields
              value={eduForm}
              onChange={(dates) => {
                setEduForm((prev) => ({ ...prev, ...dates }));
                setEduDateErrors({});
              }}
              disabled={loading}
              errors={eduDateErrors}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>CGPA</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 8.5"
                  value={eduForm.cgpa}
                  onChange={(e) => setEduForm({ ...eduForm, cgpa: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Percentage</label>
                <input
                  className={inputClass}
                  placeholder="e.g. 80.77%"
                  value={eduForm.percentage}
                  onChange={(e) => setEduForm({ ...eduForm, percentage: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Activities, societies, coursework highlights…"
                value={eduForm.description}
                onChange={(e) => setEduForm({ ...eduForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Academic achievements (optional)</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                placeholder="Honors, awards, dean's list…"
                value={eduForm.achievements}
                onChange={(e) => setEduForm({ ...eduForm, achievements: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editEduId ? (
              <button type="button" className="app-btn-secondary text-sm" onClick={() => { setEditEduId(null); resetEduForm(); }}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="app-btn-primary text-sm" disabled={loading} onClick={() => void addEducation()}>
              {loading ? 'Saving…' : editEduId ? 'Update' : 'Add education'}
            </button>
          </div>
        </AddPanel>
      </ModalShell>
    );
  }

  /* ── Experience ── */
  if (section === 'experience') {
    return (
      <ModalShell title="Experience" onClose={onClose}>
        <FieldError message={err} />
        {list.length > 0 ? (
          <div className="premium-profile-experience-list premium-profile-experience-list--modal mb-5">
            {list.map((row) => (
              <ProfileExperienceEntry
                key={row.id}
                ex={row}
                compactDescription
                className="premium-profile-experience-card--modal"
                actions={(
                  <EntryActions
                    alwaysVisible
                    onEdit={() => startEditExp(row)}
                    onDelete={() => void delExp(row.id)}
                    loading={loading}
                  />
                )}
              />
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No experience entries yet. Add your first role below.</p>
        )}

        <AddPanel label={editExpId ? 'Update entry' : 'Add entry'}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Title *</label>
                <input className={inputClass} placeholder="e.g. Software Engineer" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <input className={inputClass} placeholder="e.g. Google" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} />
              </div>
            </div>
            <ExperienceDateFields
              value={expForm}
              onChange={(dates) => {
                setExpForm((prev) => ({ ...prev, ...dates }));
                setExpDateErrors({});
              }}
              disabled={loading}
              errors={expDateErrors}
            />
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Key responsibilities and achievements…" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editExpId ? (
              <button type="button" className="app-btn-secondary text-sm" onClick={() => { setEditExpId(null); resetExpForm(); }}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="app-btn-primary text-sm" disabled={loading} onClick={() => void addExperience()}>
              {loading ? 'Saving…' : editExpId ? 'Update' : 'Add entry'}
            </button>
          </div>
        </AddPanel>
      </ModalShell>
    );
  }

  /* ── Achievements ── */
  if (section === 'achievements') {
    return (
      <ModalShell title="Achievements" onClose={onClose}>
        <FieldError message={err} />
        {achList.length > 0 ? (
          <div className="mb-5 space-y-2">
            {achList.map((row) => {
              const id = typeof row === 'string' ? null : row.id;
              const title = typeof row === 'string' ? row : row.title || '';
              const description = typeof row === 'string' ? '' : row.description || '';
              return (
                <div
                  key={id || title}
                  className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:border-border/80 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
                  </div>
                  {id ? (
                    <EntryActions
                      onEdit={() => startEditAch(row)}
                      onDelete={() => void delAch(id)}
                      loading={loading}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No achievements yet.</p>
        )}

        <AddPanel label={editAchId ? 'Update achievement' : 'Add achievement'}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input className={inputClass} placeholder="e.g. Dean's List, Hackathon Winner" value={achForm.title} onChange={(e) => setAchForm({ ...achForm, title: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Brief description…" value={achForm.description} onChange={(e) => setAchForm({ ...achForm, description: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editAchId ? (
              <button type="button" className="app-btn-secondary text-sm" onClick={() => { setEditAchId(null); setAchForm({ title: '', description: '' }); }}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="app-btn-primary text-sm" disabled={loading} onClick={() => void addAchievement()}>
              {loading ? 'Saving…' : editAchId ? 'Update' : 'Add achievement'}
            </button>
          </div>
        </AddPanel>
      </ModalShell>
    );
  }

  /* ── Skills ── */
  if (section === 'skills') {
    const legacySkills = (profileData?.professionalInfo?.skills || []).filter(
      (name) => !skillRows.some((r) => String(r.name).toLowerCase() === String(name).toLowerCase()),
    );
    const skillCount = skillRows.length;
    const skillsAtLimit = isSkillsAtLimit(skillCount);
    const canAddSkill = Boolean(editSkillId) || !skillsAtLimit;

    return (
      <ModalShell
        title="Edit skills"
        onClose={onClose}
        footer={
          <div className="flex justify-end">
            <button type="button" className="app-btn-secondary" onClick={onClose}>
              Done
            </button>
          </div>
        }
      >
        <FieldError message={err} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add professional skills — shown as tags on your profile.
          </p>
          <span
            className={cn(
              'text-xs font-semibold tabular-nums',
              skillsAtLimit ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {formatSkillsCount(skillCount)}
          </span>
        </div>

        {skillsAtLimit && !editSkillId ? (
          <p className="mb-4 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3.5 py-2.5 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Maximum {PROFILE_SKILLS_MAX} skills allowed. Remove a skill to add another.
          </p>
        ) : null}

        {skillRows.length > 0 || legacySkills.length > 0 ? (
          <div className="premium-profile-skills-grid mb-5">
            {skillRows.map((s) => (
              <span
                key={s.id}
                className="premium-profile-skill-chip premium-profile-skill-chip--editable group"
              >
                <span className="premium-profile-skill-chip__label">{s.name}</span>
                <span className="premium-profile-skill-chip__actions">
                  <button
                    type="button"
                    disabled={loading}
                    aria-label={`Edit ${s.name}`}
                    onClick={() => startEditSkill(s)}
                    className="premium-profile-skill-chip__action"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    aria-label={`Remove ${s.name}`}
                    onClick={() => void delSkill(s.id)}
                    className="premium-profile-skill-chip__action premium-profile-skill-chip__action--danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </span>
            ))}
            {legacySkills.map((name) => (
              <SkillChip key={name} name={name} className="opacity-60" />
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No skills yet. Add your first skill below.</p>
        )}

        {canAddSkill ? (
          <AddPanel label={editSkillId ? 'Update skill' : 'Add skill'}>
            {editSkillId ? (
              <>
                <div>
                  <label className={labelClass}>Skill name</label>
                  <input
                    className={inputClass}
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                  />
                </div>
                <details className="mt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground/80">Optional proficiency (0–10)</summary>
                  <div className="mt-2 w-full max-w-[8rem]">
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      max="10"
                      placeholder="—"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                    />
                  </div>
                </details>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="app-btn-secondary text-sm"
                    onClick={() => {
                      setEditSkillId(null);
                      setSkillName('');
                      setSkillLevel('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="app-btn-primary text-sm"
                    disabled={loading}
                    onClick={() => void addSkill()}
                  >
                    {loading ? 'Saving…' : 'Update skill'}
                  </button>
                </div>
              </>
            ) : (
              <SkillAutocomplete
                value={skillQuery}
                onChange={setSkillQuery}
                onSelect={(pick) => void addSkill(pick)}
                disabled={loading}
                existingSkillNames={skillRows.map((s) => s.name)}
                inputClassName={inputClass}
                placeholder="Search or create a skill (e.g. React, Node.js)…"
              />
            )}
          </AddPanel>
        ) : null}
      </ModalShell>
    );
  }

  /* ── Projects ── */
  if (section === 'projects') {
    return (
      <ModalShell title="Projects" onClose={onClose}>
        <FieldError message={err} />
        {userProjects.length > 0 ? (
          <div className="mb-5 space-y-2">
            {userProjects.map((p) => (
              <div
                key={p.id}
                className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:border-border/80 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  {p.status ? (
                    <span className="mt-1 inline-block rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {p.status}
                    </span>
                  ) : null}
                  {p.description ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-foreground/70">{p.description}</p>
                  ) : null}
                </div>
                <EntryActions
                  onEdit={() => startEditProj(p)}
                  onDelete={() => void delProject(p.id)}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No projects yet. Add your first one below.</p>
        )}

        <AddPanel label={editProjId ? 'Update project' : 'Add project'}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input className={inputClass} placeholder="Project name" value={projForm.title} onChange={(e) => setProjForm({ ...projForm, title: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={`${inputClass} resize-none`} rows={3} placeholder="What does this project do?" value={projForm.description} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Technologies (comma-separated)</label>
              <input className={inputClass} placeholder="React, Node.js, PostgreSQL…" value={projForm.technologies} onChange={(e) => setProjForm({ ...projForm, technologies: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Repository URL</label>
                <input className={inputClass} placeholder="https://github.com/…" value={projForm.github_url} onChange={(e) => setProjForm({ ...projForm, github_url: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Live demo URL</label>
                <input className={inputClass} placeholder="https://…" value={projForm.live_url} onChange={(e) => setProjForm({ ...projForm, live_url: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <input className={inputClass} placeholder="e.g. Completed, In Progress" value={projForm.status} onChange={(e) => setProjForm({ ...projForm, status: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editProjId ? (
              <button type="button" className="app-btn-secondary text-sm" onClick={() => { setEditProjId(null); setProjForm({ title: '', description: '', technologies: '', github_url: '', live_url: '', status: 'Completed' }); }}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="app-btn-primary text-sm" disabled={loading} onClick={() => void saveProject()}>
              {loading ? 'Saving…' : editProjId ? 'Update' : 'Add project'}
            </button>
          </div>
        </AddPanel>
      </ModalShell>
    );
  }

  /* ── Publications ── */
  if (section === 'publications') {
    return (
      <ModalShell title="Publications" onClose={onClose}>
        <FieldError message={err} />
        {userPublications.length > 0 ? (
          <div className="mb-5 space-y-2">
            {userPublications.map((p) => (
              <div
                key={p.id}
                className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors hover:border-border/80 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[p.venue, p.year].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <EntryActions
                  onEdit={() => startEditPub(p)}
                  onDelete={() => void delPublication(p.id)}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-foreground">No publications yet.</p>
        )}

        <AddPanel label={editPubId ? 'Update publication' : 'Add publication'}>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title *</label>
              <input className={inputClass} placeholder="Paper or article title" value={pubForm.title} onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Venue / Journal</label>
                <input className={inputClass} placeholder="e.g. IEEE, NeurIPS" value={pubForm.venue} onChange={(e) => setPubForm({ ...pubForm, venue: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input className={inputClass} type="number" min="1900" max="2099" placeholder="e.g. 2024" value={pubForm.year} onChange={(e) => setPubForm({ ...pubForm, year: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={`${inputClass} resize-none`} rows={2} placeholder="Brief abstract…" value={pubForm.description} onChange={(e) => setPubForm({ ...pubForm, description: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>URL (DOI, PDF link…)</label>
              <input className={inputClass} placeholder="https://…" value={pubForm.url} onChange={(e) => setPubForm({ ...pubForm, url: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            {editPubId ? (
              <button type="button" className="app-btn-secondary text-sm" onClick={() => { setEditPubId(null); setPubForm({ title: '', venue: '', year: '', description: '', url: '' }); }}>
                Cancel
              </button>
            ) : null}
            <button type="button" className="app-btn-primary text-sm" disabled={loading} onClick={() => void savePublication()}>
              {loading ? 'Saving…' : editPubId ? 'Update' : 'Add publication'}
            </button>
          </div>
        </AddPanel>
      </ModalShell>
    );
  }

  /* ── Teaching ── */
  if (section === 'teaching') {
    // Teaching info applies to teachers only. Refuse to open for any other
    // role even if a stale callsite still requests this section.
    if (profileData?.userType !== 'teacher') return null;
    return (
      <ModalShell
        title="Teaching information"
        onClose={onClose}
        footer={
          <ModalFooter
            onCancel={onClose}
            onSave={() => void saveTeaching()}
            loading={loading}
            cancelLabel="Close"
          />
        }
      >
        <FieldError message={err} />
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Subjects (one per line or comma-separated)</label>
            <textarea
              className={`${inputClass} min-h-[100px] resize-none`}
              placeholder="e.g. Data Structures, Algorithms, Machine Learning"
              value={teachForm.subjectsText}
              onChange={(e) => setTeachForm({ ...teachForm, subjectsText: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Years of experience</label>
            <input
              className={inputClass}
              type="number"
              step="0.1"
              placeholder="e.g. 5"
              value={teachForm.experience_years}
              onChange={(e) => setTeachForm({ ...teachForm, experience_years: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Additional information about your teaching approach…"
              value={teachForm.notes}
              onChange={(e) => setTeachForm({ ...teachForm, notes: e.target.value })}
            />
          </div>
        </div>
      </ModalShell>
    );
  }

  return null;
}
