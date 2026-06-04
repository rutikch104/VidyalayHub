// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import superAdminService from '@/services/superAdminService';

const ACK_PHRASE = 'GRANT FULL ACCESS';

function passwordStrength(password) {
  if (!password) return { score: 0, label: '', barColor: 'bg-muted' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { score, label: 'Very weak', barColor: 'bg-destructive' };
  if (score === 2) return { score, label: 'Weak', barColor: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Fair', barColor: 'bg-yellow-500' };
  if (score === 4) return { score, label: 'Good', barColor: 'bg-primary' };
  return { score, label: 'Strong', barColor: 'bg-emerald-500' };
}

/**
 * Create-super-admin form.
 *
 * Calls POST /super-admin-auth/owners (requires existing super admin session).
 * The created account gets `super_admin_owner: true` — full platform bypass —
 * so we surface a clear warning and an explicit acknowledgement step.
 */
export default function SuperAdminCreateSuperAdminModal({ open, onClose, onSuccess, onError }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acknowledged, setAcknowledged] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setAcknowledged('');
      setLocalError('');
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const strength = passwordStrength(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const ackOk = acknowledged.trim().toUpperCase() === ACK_PHRASE;
  const requiredOk =
    firstName.trim().length > 0 &&
    /.+@.+\..+/.test(email.trim()) &&
    password.length >= 6 &&
    passwordsMatch &&
    ackOk;

  const reportError = (msg) => {
    setLocalError(msg);
    onError?.(msg);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) {
      reportError('First name is required.');
      return;
    }
    if (!email.trim()) {
      reportError('Email is required.');
      return;
    }
    if (password.length < 6) {
      reportError('Password must be at least 6 characters.');
      return;
    }
    if (!passwordsMatch) {
      reportError('Passwords do not match.');
      return;
    }
    if (!ackOk) {
      reportError(`Type "${ACK_PHRASE}" to confirm.`);
      return;
    }

    setSaving(true);
    setLocalError('');
    onError?.('');
    try {
      await superAdminService.createSuperAdminOwner({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        email: email.trim().toLowerCase(),
        password,
        phone_number: phone.trim() || undefined,
      });
      onSuccess?.(email.trim().toLowerCase());
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to create super admin');
      reportError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="sa-modal-overlay items-end sm:items-center"
      onClick={() => { if (!saving) onClose?.(); }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="super-admin-create-title"
        aria-describedby="super-admin-create-warning"
        className="sa-modal sa-modal--wide flex max-h-[94vh] flex-col overflow-hidden p-0 sm:max-h-[92vh]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* Header */}
        <div className="sa-modal__head shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="sa-modal__icon">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="super-admin-create-title" className="sa-modal__title">
              Create new super admin
            </h2>
            <p className="sa-modal__desc">
              Adds a new owner-level platform account.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div
          id="super-admin-create-warning"
          className="shrink-0 border-b border-amber-200/60 bg-amber-50/80 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-950/30 sm:px-6"
        >
          <div className="flex items-start gap-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Super admins bypass all tenant scoping and RBAC checks. They can read, edit, and delete
              <strong className="font-semibold"> any data on the platform</strong>. Only create
              accounts for people you trust completely.
            </span>
          </div>
        </div>

        {/* Body */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6"
        >
          <div className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  First name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Aarav"
                  className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Last name
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sharma"
                  className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Phone <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="tel"
                autoComplete="off"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Password <span className="text-destructive">*</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">(min 6 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Use a strong, unique password"
                  className="w-full rounded-xl border border-border/60 bg-card px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength meter */}
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength.score ? strength.barColor : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              {strength.label ? (
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Strength: <span className="text-foreground">{strength.label}</span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Confirm password <span className="text-destructive">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the password"
                className={`w-full rounded-xl border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                  confirmPassword.length === 0
                    ? 'border-border/60 focus:border-primary/50 focus:ring-primary/15'
                    : passwordsMatch
                      ? 'border-emerald-300/60 focus:border-emerald-400/60 focus:ring-emerald-500/15'
                      : 'border-destructive/60 focus:border-destructive focus:ring-destructive/20'
                }`}
              />
              {confirmPassword.length > 0 && !passwordsMatch ? (
                <p className="mt-1 text-[11px] font-medium text-destructive">Passwords do not match.</p>
              ) : null}
            </div>

            {/* Explicit acknowledgement */}
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
              <label className="block text-sm font-semibold text-foreground">
                Confirm grant <span className="text-destructive">*</span>
              </label>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Type <span className="font-mono font-semibold text-foreground">{ACK_PHRASE}</span> to confirm
                you intend to grant full platform access to this account.
              </p>
              <input
                type="text"
                value={acknowledged}
                onChange={(e) => setAcknowledged(e.target.value)}
                placeholder={ACK_PHRASE}
                spellCheck={false}
                autoCapitalize="characters"
                className="mt-2 w-full rounded-lg border border-border/60 bg-card px-3 py-2 font-mono text-sm uppercase tracking-wider text-foreground placeholder:text-muted-foreground/50 placeholder:normal-case focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            {localError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                {localError}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="mt-6 flex shrink-0 flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={saving}
              className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !requiredOk}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {saving ? 'Creating…' : 'Create super admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
