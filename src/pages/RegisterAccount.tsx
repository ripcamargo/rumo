import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/common/Button';
import { registerWithEmail } from '../services/firebase/auth';
import { createUserProfile } from '../services/firebase/firestore';
import { mapAuthError } from '../utils/authErrors';

const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_WATER_GOAL_ML = 2000;

export default function RegisterAccount() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const user = await registerWithEmail(name, email, password);
      await createUserProfile(user.uid, {
        name,
        height: 0,
        initialWeight: 0,
        goalWeight: 0,
        dailyCalorieGoal: DEFAULT_CALORIE_GOAL,
        dailyWaterGoal: DEFAULT_WATER_GOAL_ML,
      });
      navigate('/configuracoes', { replace: true, state: { onboarding: true } });
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Criar conta no Rumo" subtitle="Acompanhe. Ajuste. Evolua.">
      <form className="rumo-form" onSubmit={handleSubmit}>
        <div className="rumo-auth-field">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="rumo-form-error">{error}</p>}
        <Button type="submit" size="lg" fullWidth disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
      <div className="rumo-auth-links">
        <span />
        <Link to="/login">Já tenho conta</Link>
      </div>
    </AuthLayout>
  );
}
