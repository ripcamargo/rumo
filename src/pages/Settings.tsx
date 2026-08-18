import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useToast } from '../contexts/ToastContext';
import { updateUserProfile } from '../services/firebase/firestore';
import { logout } from '../services/firebase/auth';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  const { showToast } = useToast();
  const location = useLocation();
  const isOnboarding = Boolean((location.state as { onboarding?: boolean } | null)?.onboarding);

  const [form, setForm] = useState({
    name: '',
    height: '',
    initialWeight: '',
    goalWeight: '',
    dailyCalorieGoal: '',
    dailyWaterGoal: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      height: profile.height ? String(profile.height) : '',
      initialWeight: profile.initialWeight ? String(profile.initialWeight) : '',
      goalWeight: profile.goalWeight ? String(profile.goalWeight) : '',
      dailyCalorieGoal: profile.dailyCalorieGoal ? String(profile.dailyCalorieGoal) : '',
      dailyWaterGoal: profile.dailyWaterGoal ? String(profile.dailyWaterGoal) : '',
    });
  }, [profile]);

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        name: form.name.trim(),
        height: Number(form.height.replace(',', '.')) || 0,
        initialWeight: Number(form.initialWeight.replace(',', '.')) || 0,
        goalWeight: Number(form.goalWeight.replace(',', '.')) || 0,
        dailyCalorieGoal: Number(form.dailyCalorieGoal) || 0,
        dailyWaterGoal: Number(form.dailyWaterGoal) || 0,
      });
      showToast('Perfil atualizado');
    } catch {
      showToast('Não foi possível salvar agora. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="rumo-settings">
      <h1 className="rumo-page-title">Configurações</h1>

      {isOnboarding && (
        <Card className="rumo-onboarding-banner">
          <p style={{ margin: 0 }}>
            Bem-vindo(a) ao Rumo! Complete seus dados e metas abaixo para começar a acompanhar sua
            evolução.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="rumo-settings-section">
          <h2 className="rumo-settings-section-title">Dados pessoais</h2>
          <div className="rumo-settings-grid">
            <label className="rumo-settings-field">
              <span>Nome</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
            <label className="rumo-settings-field">
              <span>Altura (cm)</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.height}
                onChange={(e) => setField('height', e.target.value)}
              />
            </label>
            <label className="rumo-settings-field">
              <span>Peso inicial (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.initialWeight}
                onChange={(e) => setField('initialWeight', e.target.value)}
              />
            </label>
            <label className="rumo-settings-field">
              <span>Peso objetivo (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                value={form.goalWeight}
                onChange={(e) => setField('goalWeight', e.target.value)}
              />
            </label>
          </div>
        </Card>

        <Card className="rumo-settings-section">
          <h2 className="rumo-settings-section-title">Metas diárias</h2>
          <div className="rumo-settings-grid">
            <label className="rumo-settings-field">
              <span>Calorias (kcal)</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.dailyCalorieGoal}
                onChange={(e) => setField('dailyCalorieGoal', e.target.value)}
              />
            </label>
            <label className="rumo-settings-field">
              <span>Água (ml)</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.dailyWaterGoal}
                onChange={(e) => setField('dailyWaterGoal', e.target.value)}
              />
            </label>
          </div>
        </Card>

        <Button type="submit" size="lg" fullWidth disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </form>

      <Button variant="outline" size="lg" fullWidth onClick={() => void logout()} className="rumo-logout-btn">
        Sair da conta
      </Button>
    </div>
  );
}
