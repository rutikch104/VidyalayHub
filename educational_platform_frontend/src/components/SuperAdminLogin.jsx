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
    <div className="sa-login-page">
      <div className="sa-login-card">
        <div className="sa-modal__head">
          <div className="sa-modal__icon" aria-hidden>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="sa-modal__title">Super Admin Login</h1>
            <p className="sa-modal__desc">Owner access for platform administration</p>
          </div>
        </div>
        {error ? <div className="sa-alert sa-alert--error mb-4">{error}</div> : null}
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="sa-modal__field">
            <label className="sa-modal__label" htmlFor="sa-login-email">
              Email
            </label>
            <input
              id="sa-login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sa-modal__input"
            />
          </div>
          <div className="sa-modal__field">
            <label className="sa-modal__label" htmlFor="sa-login-password">
              Password
            </label>
            <input
              id="sa-login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sa-modal__input"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="sa-portal__btn sa-portal__btn--primary w-full"
          >
            {loading ? 'Signing in…' : 'Sign in as Super Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
