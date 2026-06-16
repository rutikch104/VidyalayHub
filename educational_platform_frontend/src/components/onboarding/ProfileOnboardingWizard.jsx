import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Link2,
  MapPin,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import userService from '@/services/userService';
import {
  BRANCH_OPTIONS,
  DEGREE_OPTIONS,
  onboardingProgressPercent,
  parseSkillsInput,
  profileToFormState,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
} from '@/lib/onboardingUtils';
import { RegSelect } from '@/components/registration/RegistrationUI';

const STEPS = [
  { id: 'intro', label: 'Welcome' },
  { id: 'basic', label: 'About you' },
  { id: 'academic', label: 'Academic' },
  { id: 'professional', label: 'Professional' },
];

function Field({ label, children, hint }) {
  return (
    <label className="profile-onboarding__field">
      <span className="profile-onboarding__label">{label}</span>
      {children}
      {hint ? <span className="profile-onboarding__hint">{hint}</span> : null}
    </label>
  );
}

export default function ProfileOnboardingWizard({ user, onComplete, onDismiss }) {
  const userType = user?.user_type || 'student';
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const profile = await userService.getCurrentUserProfile();
        if (cancelled) return;
        setForm(profileToFormState(profile));
        const savedStep = Number(profile?.onboarding_step) || 0;
        setStep(Math.min(Math.max(savedStep, 0), STEPS.length - 1));
      } catch {
        if (!cancelled) setForm(profileToFormState(null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const progress = onboardingProgressPercent(step, STEPS.length);

  const setField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const buildPayload = useCallback((nextStep, { complete = false, skip = false } = {}) => {
    const skills = parseSkillsInput(form.skillsText);
    return {
      step: nextStep,
      complete,
      skip,
      bio: form.bio,
      location: form.location,
      phone_number: form.phone_number,
      linkedin_url: form.linkedin_url,
      github_url: form.github_url,
      website_url: form.website_url,
      degree: form.degree,
      branch: form.branch,
      year: form.year,
      semester: form.semester,
      graduation_year: form.graduation_year,
      roll_number: form.roll_number,
      university_name: form.university_name,
      student_id: form.student_id,
      cgpa: form.cgpa,
      percentage: form.percentage,
      admission_year: form.admission_year,
      company: form.company,
      position: form.position,
      industry: form.industry,
      experience: form.experience,
      department: form.department,
      designation: form.designation,
      qualification: form.qualification,
      employee_id: form.employee_id,
      faculty_id: form.faculty_id,
      joining_date: form.joining_date || undefined,
      teaching_experience: form.teaching_experience,
      research_areas: form.research_areas,
      skills,
    };
  }, [form]);

  const persist = useCallback(async (nextStep, opts = {}) => {
    setSaving(true);
    setError('');
    try {
      await userService.updateOnboardingProfile(buildPayload(nextStep, opts));
      if (opts.complete || opts.skip) {
        onComplete?.();
      } else {
        setStep(nextStep);
      }
    } catch (err) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [buildPayload, onComplete]);

  const stepTitle = useMemo(() => {
    if (step === 0) return 'Welcome to VidhyalayHub';
    if (step === 1) return 'Tell us about yourself';
    if (step === 2) {
      if (userType === 'teacher') return 'Teaching details';
      return 'Academic information';
    }
    if (userType === 'student') return 'Skills & links';
    if (userType === 'alumni') return 'Professional details';
    return 'Professional profile';
  }, [step, userType]);

  const stepDescription = useMemo(() => {
    if (step === 0) {
      return 'You signed up with the essentials. Complete your profile in a few quick steps to unlock better networking, discovery, and placement features.';
    }
    if (step === 1) {
      return 'Help classmates and recruiters recognize you. You can always update this later from your profile.';
    }
    if (step === 2 && userType === 'student') {
      return 'These details power filters like batch, branch, and year — one of VidhyalayHub\'s strongest features.';
    }
    if (step === 2 && userType === 'alumni') {
      return 'Where you studied helps alumni and students connect across batches and departments.';
    }
    if (step === 2) {
      return 'Share your department and role so students and colleagues can find you easily.';
    }
    return 'Add skills and professional links to stand out in search and recommendations.';
  }, [step, userType]);

  const renderAcademicFields = () => {
    if (userType === 'teacher') {
      return (
        <>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Employee ID">
              <input className="reg-input" value={form.employee_id || ''} onChange={(e) => setField('employee_id', e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Faculty ID">
              <input className="reg-input" value={form.faculty_id || ''} onChange={(e) => setField('faculty_id', e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Department *">
              <input className="reg-input" value={form.department || ''} onChange={(e) => setField('department', e.target.value)} placeholder="e.g. Computer Engineering" />
            </Field>
            <Field label="Designation *">
              <input className="reg-input" value={form.designation || ''} onChange={(e) => setField('designation', e.target.value)} placeholder="e.g. Assistant Professor" />
            </Field>
          </div>
          <Field label="Qualification">
            <input className="reg-input" value={form.qualification || ''} onChange={(e) => setField('qualification', e.target.value)} placeholder="e.g. M.Tech, Ph.D" />
          </Field>
        </>
      );
    }

    return (
      <>
        <Field label="University name">
          <input className="reg-input" value={form.university_name || ''} onChange={(e) => setField('university_name', e.target.value)} placeholder="Your university" />
        </Field>
        <div className="profile-onboarding__grid profile-onboarding__grid--2">
          <Field label="Degree *">
            <RegSelect value={form.degree || ''} onChange={(e) => setField('degree', e.target.value)}>
              <option value="">Select degree</option>
              {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </RegSelect>
          </Field>
          <Field label="Branch / Department *">
            <RegSelect value={form.branch || ''} onChange={(e) => setField('branch', e.target.value)}>
              <option value="">Select branch</option>
              {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </RegSelect>
          </Field>
        </div>
        {userType === 'student' ? (
          <>
            <div className="profile-onboarding__grid profile-onboarding__grid--2">
              <Field label="Current year">
                <RegSelect value={form.year || ''} onChange={(e) => setField('year', e.target.value)}>
                  <option value="">Select year</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </RegSelect>
              </Field>
              <Field label="Current semester">
                <RegSelect value={form.semester || ''} onChange={(e) => setField('semester', e.target.value)}>
                  <option value="">Semester</option>
                  {SEMESTER_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </RegSelect>
              </Field>
            </div>
            <div className="profile-onboarding__grid profile-onboarding__grid--2">
              <Field label="Student / College ID">
                <input className="reg-input" value={form.student_id || ''} onChange={(e) => setField('student_id', e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Roll number">
                <input className="reg-input" value={form.roll_number || ''} onChange={(e) => setField('roll_number', e.target.value)} placeholder="Optional" />
              </Field>
            </div>
            <div className="profile-onboarding__grid profile-onboarding__grid--2">
              <Field label="Admission year">
                <input className="reg-input" value={form.admission_year || ''} onChange={(e) => setField('admission_year', e.target.value)} placeholder="e.g. 2023" />
              </Field>
              <Field label="Expected graduation year">
                <input className="reg-input" value={form.graduation_year || ''} onChange={(e) => setField('graduation_year', e.target.value)} placeholder="e.g. 2027" />
              </Field>
            </div>
          </>
        ) : (
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Graduation year">
              <input className="reg-input" value={form.graduation_year || ''} onChange={(e) => setField('graduation_year', e.target.value)} placeholder="e.g. 2022" />
            </Field>
            <Field label="Roll number">
              <input className="reg-input" value={form.roll_number || ''} onChange={(e) => setField('roll_number', e.target.value)} placeholder="Optional" />
            </Field>
          </div>
        )}
      </>
    );
  };

  const renderProfessionalFields = () => {
    if (userType === 'alumni') {
      return (
        <>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Current company">
              <input className="reg-input" value={form.company || ''} onChange={(e) => setField('company', e.target.value)} placeholder="e.g. TCS" />
            </Field>
            <Field label="Designation">
              <input className="reg-input" value={form.position || ''} onChange={(e) => setField('position', e.target.value)} placeholder="e.g. Software Engineer" />
            </Field>
          </div>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Industry">
              <input className="reg-input" value={form.industry || ''} onChange={(e) => setField('industry', e.target.value)} placeholder="e.g. IT Services" />
            </Field>
            <Field label="Total experience">
              <input className="reg-input" value={form.experience || ''} onChange={(e) => setField('experience', e.target.value)} placeholder="e.g. 3 years" />
            </Field>
          </div>
          <Field label="Skills" hint="Separate with commas — e.g. ReactJS, AWS, Leadership">
            <input className="reg-input" value={form.skillsText || ''} onChange={(e) => setField('skillsText', e.target.value)} placeholder="ReactJS, Node.js, AWS" />
          </Field>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="LinkedIn">
              <input className="reg-input" value={form.linkedin_url || ''} onChange={(e) => setField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="GitHub / Portfolio">
              <input className="reg-input" value={form.github_url || ''} onChange={(e) => setField('github_url', e.target.value)} placeholder="https://github.com/..." />
            </Field>
          </div>
        </>
      );
    }

    if (userType === 'teacher') {
      return (
        <>
          <Field label="Teaching experience">
            <input className="reg-input" value={form.teaching_experience || ''} onChange={(e) => setField('teaching_experience', e.target.value)} placeholder="e.g. 8 years" />
          </Field>
          <Field label="Research areas">
            <textarea className="reg-textarea profile-onboarding__textarea" rows={3} value={form.research_areas || ''} onChange={(e) => setField('research_areas', e.target.value)} placeholder="AI, Machine Learning, Data Science…" />
          </Field>
          <Field label="LinkedIn">
            <input className="reg-input" value={form.linkedin_url || ''} onChange={(e) => setField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
        </>
      );
    }

    return (
      <>
        <Field label="Skills" hint="Separate with commas — powers discovery filters like 'Students with ReactJS'">
          <input className="reg-input" value={form.skillsText || ''} onChange={(e) => setField('skillsText', e.target.value)} placeholder="ReactJS, Python, AWS" />
        </Field>
        <div className="profile-onboarding__grid profile-onboarding__grid--2">
          <Field label="LinkedIn">
            <input className="reg-input" value={form.linkedin_url || ''} onChange={(e) => setField('linkedin_url', e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="GitHub">
            <input className="reg-input" value={form.github_url || ''} onChange={(e) => setField('github_url', e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Portfolio / website">
          <input className="reg-input" value={form.website_url || ''} onChange={(e) => setField('website_url', e.target.value)} placeholder="Optional" />
        </Field>
      </>
    );
  };

  const renderStepBody = () => {
    if (loading) {
      return (
        <div className="profile-onboarding__loading">
          <div className="loading-spinner h-8 w-8" />
          <p>Loading your profile…</p>
        </div>
      );
    }

    if (step === 0) {
      return (
        <div className="profile-onboarding__intro">
          <div className="profile-onboarding__intro-icon">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <ul className="profile-onboarding__intro-list">
            <li><User className="h-4 w-4" aria-hidden /> Build a discoverable campus profile</li>
            <li><GraduationCap className="h-4 w-4" aria-hidden /> Enable batch, branch & skill filters</li>
            <li><Link2 className="h-4 w-4" aria-hidden /> Connect with students, alumni & faculty</li>
          </ul>
          <p className="profile-onboarding__intro-note">
            Takes about 2 minutes. Skip anytime — you can finish later from Profile or Settings.
          </p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <>
          <Field label="Bio">
            <textarea className="reg-textarea profile-onboarding__textarea" rows={3} value={form.bio || ''} onChange={(e) => setField('bio', e.target.value)} placeholder="A short intro about you…" />
          </Field>
          <div className="profile-onboarding__grid profile-onboarding__grid--2">
            <Field label="Location">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input className="app-input pl-9" value={form.location || ''} onChange={(e) => setField('location', e.target.value)} placeholder="City, State" />
              </div>
            </Field>
            <Field label="Mobile number">
              <input className="reg-input" value={form.phone_number || ''} onChange={(e) => setField('phone_number', e.target.value)} placeholder="Optional" />
            </Field>
          </div>
        </>
      );
    }

    if (step === 2) return renderAcademicFields();
    if (step === 3) return renderProfessionalFields();
    return null;
  };

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      void persist(step, { complete: true });
      return;
    }
    void persist(step + 1);
  };

  const handleBack = () => {
    if (step <= 0) return;
    setStep((s) => s - 1);
  };

  const handleSkipAll = () => {
    void persist(step, { skip: true });
  };

  return (
    <div className="profile-onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="profile-onboarding__backdrop" aria-hidden />
      <div className="profile-onboarding__panel">
        <div className="profile-onboarding__head">
          <div className="profile-onboarding__head-top">
            <div>
              <p className="profile-onboarding__eyebrow">Complete your profile</p>
              <h2 id="onboarding-title" className="profile-onboarding__title">{stepTitle}</h2>
            </div>
            <button type="button" className="profile-onboarding__close" onClick={handleSkipAll} aria-label="Skip for now">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="profile-onboarding__desc">{stepDescription}</p>
          <div className="profile-onboarding__progress-wrap">
            <div className="profile-onboarding__progress-meta">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="profile-onboarding__progress-track">
              <div className="profile-onboarding__progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="profile-onboarding__body">
          {error ? <div className="app-alert-error mb-4">{error}</div> : null}
          {renderStepBody()}
        </div>

        <div className="profile-onboarding__foot">
          <button type="button" className="profile-onboarding__skip" onClick={handleSkipAll} disabled={saving}>
            Skip for now
          </button>
          <div className="profile-onboarding__actions">
            {step > 0 ? (
              <button type="button" className="app-btn-secondary profile-onboarding__btn" onClick={handleBack} disabled={saving}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            <button type="button" className="app-btn-primary profile-onboarding__btn" onClick={handleNext} disabled={saving || loading}>
              {saving ? 'Saving…' : step >= STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
