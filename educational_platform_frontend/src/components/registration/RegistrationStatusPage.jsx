import React, { useState } from 'react';
import { Loader2, Search, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import authService from '@/services/authService';
import { REGISTRATION_STATUS_LABELS } from '@/lib/registrationConfig';
import {
  RegAlert,
  RegField,
  RegInput,
  RegPageHeader,
  RegWizardCard,
} from '@/components/registration/RegistrationUI';

function statusBadgeClass(status) {
  if (status === 'approved') return 'reg-status-badge reg-status-badge--approved';
  if (status === 'rejected') return 'reg-status-badge reg-status-badge--rejected';
  return 'reg-status-badge';
}

function statusIcon(status, isApproved) {
  if (isApproved || status === 'approved') return CheckCircle2;
  if (status === 'rejected') return XCircle;
  return Clock;
}

export default function RegistrationStatusPage() {
  const params = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(params.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);

  const handleCheck = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setStatus(null);
    try {
      const data = await authService.getRegistrationStatus(email.trim());
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Could not find registration.');
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = status ? statusIcon(status.registration_status, status.is_approved) : Clock;

  return (
    <div className="auth-shell">
      <div className="auth-panel-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Registration status</span>
        </div>
        <p className="my-auto max-w-sm text-white/80 leading-relaxed">
          Track your campus verification status. Accounts are activated only after college administration approval.
        </p>
      </div>
      <div className="auth-panel-form">
        <div className="w-full auth-panel-form__inner">
          <RegPageHeader
            eyebrow=""
            title="Check your status"
            description="Enter the email you used when registering."
          />

          <RegWizardCard>
            <form className="space-y-4" onSubmit={handleCheck}>
              <RegField label="Email address" required htmlFor="status-email">
                <RegInput
                  id="status-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </RegField>
              <button type="submit" disabled={loading} className="reg-btn reg-btn--primary reg-btn--block">
                {loading ? <Loader2 className="reg-btn__spinner h-4 w-4" /> : <Search className="h-4 w-4" />}
                Check status
              </button>
            </form>
          </RegWizardCard>

          {error ? <div className="mt-4"><RegAlert>{error}</RegAlert></div> : null}

          {status ? (
            <div className="reg-status-card">
              <div className="reg-status-card__head">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Applicant</p>
                <p className="mt-1 text-xl font-bold tracking-tight">{status.name}</p>
                <p className="text-sm text-muted-foreground">{status.email}</p>
                {status.college_name ? (
                  <p className="mt-2 text-sm"><span className="font-semibold text-foreground">College:</span> {status.college_name}</p>
                ) : null}
                <span className={statusBadgeClass(status.registration_status)}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.registration_status_label || REGISTRATION_STATUS_LABELS[status.registration_status]}
                </span>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {status.rejection_reason ? (
                  <div className="reg-alert reg-alert--error" role="alert">
                    <strong>Reason:</strong> {status.rejection_reason}
                  </div>
                ) : null}
                {status.admin_notes ? (
                  <p className="text-muted-foreground leading-relaxed"><strong className="text-foreground">Admin note:</strong> {status.admin_notes}</p>
                ) : null}
                {!status.is_approved ? (
                  <p className="text-muted-foreground leading-relaxed">
                    You will receive full platform access once your college administration approves your registration.
                  </p>
                ) : (
                  <a href="/" className="reg-btn reg-btn--primary inline-flex">Sign in now</a>
                )}
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <a href="/register" className="font-semibold text-primary hover:underline">Back to registration</a>
            {' · '}
            <a href="/" className="font-semibold text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
