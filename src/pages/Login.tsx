import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/common/Button';
import { loginWithEmail } from '../services/firebase/auth';
import { mapAuthError } from '../utils/authErrors';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithEmail(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Entrar no Rumo" subtitle="Acompanhe. Ajuste. Evolua.">
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
        <div className="rumo-auth-field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="rumo-form-error">{error}</p>}
        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <div className="rumo-auth-links">
        <Link to="/recuperar-senha">Esqueci a senha</Link>
        <Link to="/cadastro">Criar conta</Link>
      </div>
    </AuthLayout>
  );
}
