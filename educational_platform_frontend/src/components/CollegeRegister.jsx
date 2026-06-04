import React, { useState } from 'react';
import tenantService from '@/services/tenantService';
import {
  Building2, Mail, Lock, MapPin, ArrowRight, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';

const emptyForm = () => ({
  name: '',
  type: 'University',
  email: '',
  password: '',
  confirm_password: '',
  full_address: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  affiliation: '',
  website: '',
  about: '',
  campus_locations: '',
  programs_text: '',
  streams_text: '',
  student_capacity: '',
  faculty_strength: '',
  library_facility: true,
  lab_facility: true,
  sports_facility: true,
});

export default function CollegeRegister() {
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const programs_offered = form.programs_text
        ? form.programs_text.split(',').map((s) => s.trim()).filter(Boolean)
        : null;
      const streams_offered = form.streams_text
        ? form.streams_text.split(',').map((s) => s.trim()).filter(Boolean)
        : null;
      const payload = {
        name: form.name.trim(),
        type: form.type,
        affiliation: form.affiliation.trim() || null,
        accreditation_status: null,
        established_year: null,
        website: form.website.trim() || null,
        logo_url: null,
        about: form.about.trim() || null,
        full_address: form.full_address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        country: form.country.trim() || 'India',
        campus_locations: form.campus_locations.trim() || null,
        programs_offered,
        streams_offered,
        student_capacity: form.student_capacity ? parseInt(form.student_capacity, 10) : null,
        faculty_strength: form.faculty_strength ? parseInt(form.faculty_strength, 10) : null,
        library_facility: form.library_facility,
        lab_facility: form.lab_facility,
        sports_facility: form.sports_facility,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
      };
      await tenantService.submitCollegeApplication(payload);
      setDone(true);
      setForm(emptyForm());
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Submission failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-shell">
        <div className="auth-panel-brand flex flex-col justify-center">
          <Building2 className="mx-auto mb-4 h-14 w-14 text-white/90" />
          <h1 className="text-center text-2xl font-bold text-white">Application received</h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/85">
            A platform super admin will review your college. Once approved, it will appear in the student registration
            college list.
          </p>
        </div>
        <div className="auth-panel-form flex items-center justify-center">
          <div className="max-w-md text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
            <a href="/register" className="app-btn-primary inline-flex justify-center px-6 py-2.5">
              Continue to student registration
            </a>
            <p className="mt-6 text-sm text-muted-foreground">
              <a href="/" className="font-semibold text-primary hover:underline">Sign in</a>
              {' · '}
              <a href="/register" className="font-semibold text-primary hover:underline">Student register</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VidhyalayHub</span>
        </div>
        <div className="my-auto py-10">
          <h1 className="mb-3 text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            Register your college
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/80">
            Submit your institution details. After super-admin approval, students can select your college when they
            create an account. Their signup will then await approval from your college admin team.
          </p>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} VidhyalayHub</p>
      </div>

      <div className="auth-panel-form">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">College application</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fields marked * are required. You will use the admin email below for your college portal later.
            </p>
          </div>

          <form className="space-y-4" onSubmit={(ev) => void handleSubmit(ev)}>
            {error ? (
              <div className="app-alert-error animate-fade-scale" role="alert">{error}</div>
            ) : null}

            <div>
              <label className="app-label" htmlFor="cr-name">College name *</label>
              <input id="cr-name" name="name" required className="app-input" value={form.name} onChange={onChange} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="app-label" htmlFor="cr-type">Type *</label>
                <select id="cr-type" name="type" className="app-input" value={form.type} onChange={onChange}>
                  <option value="University">University</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Arts College">Arts College</option>
                </select>
              </div>
              <div>
                <label className="app-label" htmlFor="cr-aff">Affiliation</label>
                <input id="cr-aff" name="affiliation" className="app-input" value={form.affiliation} onChange={onChange} />
              </div>
            </div>

            <div>
              <label className="app-label" htmlFor="cr-about">About</label>
              <textarea id="cr-about" name="about" rows={2} className="app-input resize-none" value={form.about} onChange={onChange} />
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4" /> Campus address *
              </p>
              <div className="space-y-3">
                <input name="full_address" required className="app-input" placeholder="Full address *" value={form.full_address} onChange={onChange} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="city" required className="app-input" placeholder="City *" value={form.city} onChange={onChange} />
                  <input name="state" required className="app-input" placeholder="State *" value={form.state} onChange={onChange} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="pincode" required className="app-input" placeholder="PIN *" value={form.pincode} onChange={onChange} />
                  <input name="country" className="app-input" placeholder="Country" value={form.country} onChange={onChange} />
                </div>
                <input name="campus_locations" className="app-input" placeholder="Campus locations (optional)" value={form.campus_locations} onChange={onChange} />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold text-foreground">Academics (optional)</p>
              <input name="programs_text" className="app-input mb-2" placeholder="Programs offered (comma-separated)" value={form.programs_text} onChange={onChange} />
              <input name="streams_text" className="app-input mb-2" placeholder="Streams (comma-separated)" value={form.streams_text} onChange={onChange} />
              <div className="grid grid-cols-2 gap-3">
                <input name="student_capacity" className="app-input" placeholder="Student capacity" value={form.student_capacity} onChange={onChange} />
                <input name="faculty_strength" className="app-input" placeholder="Faculty strength" value={form.faculty_strength} onChange={onChange} />
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="library_facility" checked={form.library_facility} onChange={onChange} />
                  Library
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="lab_facility" checked={form.lab_facility} onChange={onChange} />
                  Labs
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="sports_facility" checked={form.sports_facility} onChange={onChange} />
                  Sports
                </label>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold text-foreground">College admin contact *</p>
              <div className="relative mb-3">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input name="email" type="email" required autoComplete="email" className="app-input pl-10" placeholder="Admin email *" value={form.email} onChange={onChange} />
              </div>
              <div className="relative mb-3">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input name="password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" className="app-input pl-10 pr-10" placeholder="Password *" value={form.password} onChange={onChange} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input name="confirm_password" type={showPassword ? 'text' : 'password'} required className="app-input" placeholder="Confirm password *" value={form.confirm_password} onChange={onChange} />
            </div>

            <input name="website" className="app-input" placeholder="Website (optional, e.g. https://college.edu)" value={form.website} onChange={onChange} />

            <button type="submit" disabled={loading} className="app-btn-primary mt-2 w-full justify-center gap-2 py-3">
              {loading ? 'Submitting…' : (
                <>
                  Submit application
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <a href="/register" className="font-semibold text-primary hover:underline">Student registration</a>
            {' · '}
            <a href="/" className="font-semibold text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
