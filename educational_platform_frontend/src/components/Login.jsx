import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Sparkles, BookOpen, Users, Briefcase, ArrowRight } from 'lucide-react';

const BRAND_STATS = [
  { icon: Users,    value: '12,000+', label: 'Students & Alumni' },
  { icon: BookOpen, value: '3,400+',  label: 'Library Resources' },
  { icon: Briefcase,value: '850+',    label: 'Job Opportunities' },
];

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email)               { setError('Email is required');          return; }
    if (!email.includes('@')) { setError('Please enter a valid email'); return; }
    if (!password)            { setError('Password is required');       return; }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err?.response?.data?.message;
      setError(msg || 'Login failed. Please try again.');
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
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Your campus. Connected.
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
            Learn, connect,&nbsp;&amp;<br />grow together.
          </h1>
          <p className="mb-10 max-w-sm text-base leading-relaxed text-white/80">
            The all-in-one platform for students, teachers, and alumni — featuring smart feeds, career tools, AI interview prep, and more.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {BRAND_STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/10">
                <Icon className="mb-2 h-5 w-5 text-white/70" />
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} RCPIT VidhyalayHub · All rights reserved
        </p>
      </div>

      {/* ── Right form ───────────────────────────────────── */}
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
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to continue to your campus workspace.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            {error && (
              <div className="app-alert-error animate-fade-scale" role="alert">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="app-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input pl-10"
                  placeholder="you@university.edu"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary transition-colors hover:text-brand-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input pr-11 pl-10"
                  placeholder="••••••••"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a
              href="/register"
              className="font-semibold text-primary underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
            >
              Create an account
            </a>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Institution not on the platform?{' '}
            <a href="/register-college" className="font-semibold text-primary hover:underline">
              Register your college
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}