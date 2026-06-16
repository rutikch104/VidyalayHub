import React from 'react';
import CampusRegistrationWizard from '@/components/registration/CampusRegistrationWizard';
import { RegPageHeader } from '@/components/registration/RegistrationUI';
import { ShieldCheck } from 'lucide-react';

export default function Register() {
  return (
    <div className="auth-shell">
      <div className="auth-panel-brand">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VidhyalayHub</span>
        </div>

        <div className="my-auto py-12">
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
            Verified campus<br />network.
          </h1>
          <p className="mb-10 max-w-sm text-base leading-relaxed text-white/80">
            Register with your college. Your account is activated after admin verification.
          </p>
          <ul className="space-y-3">
            {[
              'Submit your details',
              'Admin reviews your application',
              'Start using the platform',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} RCPIT VidhyalayHub</p>
      </div>

      <div className="auth-panel-form">
        <div className="auth-panel-form__inner">
          <div className="mb-5 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">VidhyalayHub</span>
          </div>

          <RegPageHeader
            title="Create your account"
            description="Register with your college details. Your account will be reviewed before activation."
          />

          <CampusRegistrationWizard />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <a href="/registration-status" className="font-medium text-primary hover:underline">Track status</a>
            {' · '}
            <a href="/" className="font-medium text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
