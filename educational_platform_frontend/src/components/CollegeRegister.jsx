import React, { useState } from 'react';
import tenantService from '@/services/tenantService';
import {
  Building2,
  Mail,
  Lock,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import {
  RegAlert,
  RegCheck,
  RegField,
  RegGrid,
  RegInput,
  RegPageHeader,
  RegSection,
  RegSelect,
  RegTextarea,
  RegWizardCard,
} from '@/components/registration/RegistrationUI';

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
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-white/85 leading-relaxed">
            A platform super admin will review your college. Once approved, it will appear in the student registration college list.
          </p>
        </div>
        <div className="auth-panel-form flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="reg-success mx-auto max-w-sm">
              <div className="reg-success__icon mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="reg-success__title">Thank you!</h3>
              <p className="reg-success__text">Your college application is under review.</p>
              <a href="/register" className="reg-btn reg-btn--primary reg-btn--block mt-4">
                Continue to student registration
              </a>
            </div>
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
            Submit your institution details. After super-admin approval, students can select your college when they create an account.
          </p>
        </div>
        <p className="text-xs text-white/50">© {new Date().getFullYear()} VidhyalayHub</p>
      </div>

      <div className="auth-panel-form">
        <div className="w-full auth-panel-form__inner">
          <RegPageHeader
            eyebrow="Institution onboarding"
            title="College application"
            description="Fields marked with * are required. You will use the admin email below for your college portal later."
          />

          <RegWizardCard>
            <form className="reg-wizard" onSubmit={(ev) => void handleSubmit(ev)}>
              {error ? <RegAlert>{error}</RegAlert> : null}

              <RegSection icon={Building2} title="Institution details" description="Basic information about your college or university.">
                <RegField label="College name" required htmlFor="cr-name">
                  <RegInput id="cr-name" name="name" required value={form.name} onChange={onChange} placeholder="e.g. RCP Institute of Technology" />
                </RegField>
                <RegGrid cols={2}>
                  <RegField label="Type" required htmlFor="cr-type">
                    <RegSelect id="cr-type" name="type" value={form.type} onChange={onChange}>
                      <option value="University">University</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Arts College">Arts College</option>
                    </RegSelect>
                  </RegField>
                  <RegField label="Affiliation" optional htmlFor="cr-aff">
                    <RegInput id="cr-aff" name="affiliation" value={form.affiliation} onChange={onChange} />
                  </RegField>
                </RegGrid>
                <RegField label="About" optional htmlFor="cr-about">
                  <RegTextarea id="cr-about" name="about" rows={3} value={form.about} onChange={onChange} placeholder="Brief description of your institution" />
                </RegField>
              </RegSection>

              <RegSection icon={MapPin} title="Campus address" description="Primary location of your institution." divider>
                <RegField label="Full address" required htmlFor="cr-addr">
                  <RegInput id="cr-addr" name="full_address" required value={form.full_address} onChange={onChange} placeholder="Street, area, landmark" />
                </RegField>
                <RegGrid cols={2}>
                  <RegField label="City" required htmlFor="cr-city"><RegInput id="cr-city" name="city" required value={form.city} onChange={onChange} /></RegField>
                  <RegField label="State" required htmlFor="cr-state"><RegInput id="cr-state" name="state" required value={form.state} onChange={onChange} /></RegField>
                  <RegField label="PIN code" required htmlFor="cr-pin"><RegInput id="cr-pin" name="pincode" required value={form.pincode} onChange={onChange} /></RegField>
                  <RegField label="Country" optional htmlFor="cr-country"><RegInput id="cr-country" name="country" value={form.country} onChange={onChange} /></RegField>
                </RegGrid>
                <RegField label="Campus locations" optional htmlFor="cr-camp"><RegInput id="cr-camp" name="campus_locations" value={form.campus_locations} onChange={onChange} placeholder="Additional campuses (optional)" /></RegField>
              </RegSection>

              <RegSection icon={GraduationCap} title="Academics" description="Optional details about programs and facilities." divider>
                <RegField label="Programs offered" optional htmlFor="cr-prog" hint="Comma-separated list">
                  <RegInput id="cr-prog" name="programs_text" value={form.programs_text} onChange={onChange} placeholder="B.Tech, M.Tech, MBA" />
                </RegField>
                <RegField label="Streams" optional htmlFor="cr-stream" hint="Comma-separated list">
                  <RegInput id="cr-stream" name="streams_text" value={form.streams_text} onChange={onChange} placeholder="CSE, ECE, Mechanical" />
                </RegField>
                <RegGrid cols={2}>
                  <RegField label="Student capacity" optional htmlFor="cr-cap"><RegInput id="cr-cap" name="student_capacity" value={form.student_capacity} onChange={onChange} inputMode="numeric" /></RegField>
                  <RegField label="Faculty strength" optional htmlFor="cr-fac"><RegInput id="cr-fac" name="faculty_strength" value={form.faculty_strength} onChange={onChange} inputMode="numeric" /></RegField>
                </RegGrid>
                <div className="reg-check-row">
                  <RegCheck name="library_facility" checked={form.library_facility} onChange={onChange}>Library</RegCheck>
                  <RegCheck name="lab_facility" checked={form.lab_facility} onChange={onChange}>Labs</RegCheck>
                  <RegCheck name="sports_facility" checked={form.sports_facility} onChange={onChange}>Sports</RegCheck>
                </div>
              </RegSection>

              <RegSection icon={Lock} title="College admin contact" description="Credentials for your primary college administrator account." divider>
                <RegField label="Admin email" required htmlFor="cr-email">
                  <RegInput id="cr-email" name="email" type="email" required icon={Mail} value={form.email} onChange={onChange} autoComplete="email" placeholder="admin@college.edu" />
                </RegField>
                <RegField label="Password" required htmlFor="cr-pass">
                  <RegInput
                    id="cr-pass"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    icon={Lock}
                    value={form.password}
                    onChange={onChange}
                    autoComplete="new-password"
                    rightAction={(
                      <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  />
                </RegField>
                <RegField label="Confirm password" required htmlFor="cr-pass2">
                  <RegInput id="cr-pass2" name="confirm_password" type={showPassword ? 'text' : 'password'} required value={form.confirm_password} onChange={onChange} autoComplete="new-password" />
                </RegField>
                <RegField label="Website" optional htmlFor="cr-web">
                  <RegInput id="cr-web" name="website" value={form.website} onChange={onChange} placeholder="https://college.edu" />
                </RegField>
              </RegSection>

              <button type="submit" disabled={loading} className="reg-btn reg-btn--primary reg-btn--block">
                {loading ? 'Submitting…' : (
                  <>
                    Submit application
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </RegWizardCard>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <a href="/register" className="font-semibold text-primary hover:underline">Student registration</a>
            {' · '}
            <a href="/" className="font-semibold text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
