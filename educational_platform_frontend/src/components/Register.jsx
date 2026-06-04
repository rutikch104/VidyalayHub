import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_MODE } from '@/services/mockApi';
import tenantService from '@/services/tenantService';
import {
  Mail, Lock, User, Eye, EyeOff, ArrowRight, GraduationCap, Briefcase, Globe, Building2,
} from 'lucide-react';

const ROLE_OPTIONS = [
  {
    value: 'student',
    label: 'Student',
    desc: 'Currently enrolled in a course',
    icon: GraduationCap,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    ring: 'ring-blue-400',
    border: 'border-blue-300',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    desc: 'Faculty or instructor',
    icon: Globe,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-400',
    border: 'border-emerald-300',
  },
  {
    value: 'alumni',
    label: 'Alumni',
    desc: 'Graduate of this institution',
    icon: Briefcase,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    ring: 'ring-violet-400',
    border: 'border-violet-300',
  },
];

export default function Register() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', last_name: '', user_type: 'student', tenant_id: '',
  });
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCollegesLoading(true);
      try {
        if (MOCK_MODE) {
          if (!cancelled) {
            setColleges([{ tenant_id: '1', name: 'Demo College (mock)', type: 'University', city: 'Shirpur', state: 'MH' }]);
            setFormData((p) => ({ ...p, tenant_id: '1' }));
          }
        } else {
          const list = await tenantService.getApprovedColleges();
          if (!cancelled) setColleges(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setCollegesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    if (!MOCK_MODE && !formData.tenant_id) {
      setError('Please select your college.');
      setLoading(false);
      return;
    }
    try {
      const result = await register(formData);
      if (result?.pendingApproval) {
        setSuccessMsg(
          result.message
            || 'Registration submitted. Your college administrator can approve you under Admin → Students (inactive filter) in their portal.',
        );
        setFormData((p) => ({
          ...p,
          password: '',
          tenant_id: p.tenant_id,
        }));
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── Left branding panel ────────────────────────────────── */}
      <div className="auth-panel-brand">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
            <span className="text-lg font-extrabold tracking-tight text-white">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VidhyalayHub</span>
        </div>

        {/* Headline */}
        <div className="my-auto py-12">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
            Start your journey<br />today.
          </h1>
          <p className="mb-10 max-w-sm text-base leading-relaxed text-white/80">
            Join thousands of students, teachers, and alumni building their professional network on VidhyalayHub.
          </p>

          {/* Feature list */}
          <ul className="space-y-4">
            {[
              'Intelligent social feed & content sharing',
              'AI-powered interview & English practice',
              'Jobs board & career resources',
              'Library, events & community spaces',
            ].map((f) => (
              <li key={f} className="flex items-start gap-3 text-white/85 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-white font-bold text-xs">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} RCPIT VidhyalayHub · All rights reserved
        </p>
      </div>

      {/* ── Right form panel ───────────────────────────────────── */}
      <div className="auth-panel-form">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-xs">
              <span className="text-xs font-extrabold">R</span>
            </div>
            <span className="text-base font-bold text-foreground">VidhyalayHub</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join the educational platform in a few steps.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {successMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 animate-fade-scale" role="status">
                {successMsg}
              </div>
            )}
            {error && (
              <div className="app-alert-error animate-fade-scale" role="alert">
                {error}
              </div>
            )}

            {/* College selector — approved tenants only */}
            <div>
              <label htmlFor="reg-tenant" className="app-label">College / institution *</label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="reg-tenant"
                  name="tenant_id"
                  required={!MOCK_MODE}
                  disabled={collegesLoading || (!MOCK_MODE && colleges.length === 0)}
                  value={formData.tenant_id}
                  onChange={handleChange}
                  className="app-input pl-10"
                >
                  <option value="">{collegesLoading ? 'Loading colleges…' : colleges.length ? 'Select your college' : 'No colleges available yet'}</option>
                  {colleges.map((c) => (
                    <option key={c.tenant_id} value={c.tenant_id}>
                      {c.name}{c.city ? ` — ${c.city}` : ''}{c.state ? `, ${c.state}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {!MOCK_MODE && !collegesLoading && colleges.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your institution is not listed yet?{' '}
                  <a href="/register-college" className="font-semibold text-primary underline-offset-2 hover:underline">
                    Register your college first
                  </a>
                  .
                </p>
              )}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first-name" className="app-label">First name</label>
                <div className="relative">
                  <input
                    id="reg-first-name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="app-input pr-9"
                    placeholder="Jane"
                  />
                  <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div>
                <label htmlFor="reg-last-name" className="app-label">Last name</label>
                <div className="relative">
                  <input
                    id="reg-last-name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleChange}
                    className="app-input pr-9"
                    placeholder="Doe"
                  />
                  <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="app-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="app-input pl-10"
                  placeholder="you@university.edu"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="app-label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="app-input pl-10 pr-11"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Role selector — visual cards */}
            <div>
              <p className="app-label">I am a</p>
              <div className="grid grid-cols-3 gap-2.5">
                {ROLE_OPTIONS.map(({ value, label, desc, icon: Icon, color, bg, ring, border }) => {
                  const selected = formData.user_type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, user_type: value }))}
                      className={[
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all duration-150',
                        selected
                          ? `${border} ${bg} ring-2 ${ring}/30`
                          : 'border-border bg-muted/30 hover:border-border hover:bg-muted/60',
                      ].join(' ')}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? bg : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${selected ? color : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
                        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{desc}</p>
                      </div>
                      {/* hidden radio so form value is tracked */}
                      <input
                        type="radio"
                        name="user_type"
                        value={value}
                        checked={selected}
                        onChange={handleChange}
                        className="sr-only"
                        aria-label={label}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Registering a new institution?{' '}
            <a href="/register-college" className="font-semibold text-primary underline-offset-2 hover:underline">
              College / university application
            </a>
          </p>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <a
              href="/"
              className="font-semibold text-primary underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
