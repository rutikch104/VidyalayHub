import { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminLogin({ onSuccess }) {
  const { superAdminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await superAdminLogin(email.trim(), password);
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to log in as super admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Super Admin Login</h1>
            <p className="text-sm text-muted-foreground">Owner access for platform administration</p>
          </div>
        </div>
        {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in as Super Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
