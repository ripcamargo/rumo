import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/common/Button';
import { resetPassword } from '../services/firebase/auth';
import { mapAuthError } from '../utils/authErrors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <p style={{ textAlign: 'center', color: 'var(--rumo-text-secondary)' }}>
          Enviamos um link de redefinição de senha para <strong>{email}</strong>.
        </p>
        <Link to="/login" style={{ textAlign: 'center', color: 'var(--rumo-navy)', fontWeight: 500 }}>
          Voltar ao login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha.">
      <form className="rumo-form" onSubmit={handleSubmit}>
        <div className="rumo-auth-field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="rumo-form-error">{error}</p>}
        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link'}
        </Button>
      </form>
      <div className="rumo-auth-links">
        <Link to="/login">Voltar ao login</Link>
        <span />
      </div>
    </AuthLayout>
  );
}
