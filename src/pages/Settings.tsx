import { useEffect, useState, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useToast } from '../contexts/ToastContext';
import { updateUserProfile } from '../services/firebase/firestore';
import { logout } from '../services/firebase/auth';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { activityLevelLabel, sexLabel } from '../utils/labels';
import './Settings.css';

function toInputDate(dateValue: Date | Timestamp | null | undefined): string {
  if (!dateValue) return '';
  const date = dateValue instanceof Date ? dateValue : dateValue.toDate();
  const offset = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offset.toISOString().slice(0, 10);
}

function formatInputDate(value: string): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading } = useUserProfile(user?.uid);
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isOnboarding = Boolean((location.state as { onboarding?: boolean } | null)?.onboarding);

  const [form, setForm] = useState({
    name: '',
    sex: '',
    birthDate: '',
    height: '',
    initialWeight: '',
    goalWeight: '',
    activityLevel: 'moderately_active',
    dailyCalorieGoal: '',
    dailyWaterGoal: '',
  });
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(isOnboarding);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? '',
      sex: profile.sex ?? '',
      birthDate: toInputDate(profile.birthDate ?? null),
      height: profile.height ? String(profile.height) : '',
      initialWeight: profile.initialWeight ? String(profile.initialWeight) : '',
      goalWeight: profile.goalWeight ? String(profile.goalWeight) : '',
      activityLevel: profile.activityLevel ?? 'moderately_active',
      dailyCalorieGoal: profile.dailyCalorieGoal ? String(profile.dailyCalorieGoal) : '',
      dailyWaterGoal: profile.dailyWaterGoal ? String(profile.dailyWaterGoal) : '',
    });
  }, [profile]);

  function handleCancelEditProfile() {
    if (profile) {
      setForm((current) => ({
        ...current,
        name: profile.name ?? '',
        sex: profile.sex ?? '',
        birthDate: toInputDate(profile.birthDate ?? null),
        height: profile.height ? String(profile.height) : '',
        initialWeight: profile.initialWeight ? String(profile.initialWeight) : '',
        goalWeight: profile.goalWeight ? String(profile.goalWeight) : '',
        activityLevel: profile.activityLevel ?? 'moderately_active',
      }));
    }
    setEditingProfile(false);
  }

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const nextSex = form.sex === 'male' || form.sex === 'female' ? form.sex : undefined;
      const nextActivityLevel =
        form.activityLevel === 'sedentary' ||
        form.activityLevel === 'lightly_active' ||
        form.activityLevel === 'moderately_active' ||
        form.activityLevel === 'very_active' ||
        form.activityLevel === 'extremely_active'
          ? form.activityLevel
          : 'moderately_active';

      await updateUserProfile(user.uid, {
        name: form.name.trim(),
        sex: nextSex,
        birthDate: form.birthDate ? Timestamp.fromDate(new Date(`${form.birthDate}T12:00:00`)) : null,
        height: Number(form.height.replace(',', '.')) || 0,
        initialWeight: Number(form.initialWeight.replace(',', '.')) || 0,
        goalWeight: Number(form.goalWeight.replace(',', '.')) || 0,
        activityLevel: nextActivityLevel,
        dailyCalorieGoal: Number(form.dailyCalorieGoal) || 0,
        dailyWaterGoal: Number(form.dailyWaterGoal) || 0,
      });
      showToast('Perfil atualizado');
      setEditingProfile(false);
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
          <div className="rumo-settings-section-header">
            <h2 className="rumo-settings-section-title">Dados pessoais</h2>
            {editingProfile ? (
              <button
                type="button"
                className="rumo-form-link"
                onClick={handleCancelEditProfile}
              >
                Cancelar
              </button>
            ) : (
              <Button type="button" variant="outline" onClick={() => setEditingProfile(true)}>
                Editar perfil
              </Button>
            )}
          </div>

          {editingProfile ? (
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
                <span>Sexo</span>
                <select value={form.sex} onChange={(e) => setField('sex', e.target.value)}>
                  <option value="">Selecionar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </label>
              <label className="rumo-settings-field">
                <span>Data de nascimento</span>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setField('birthDate', e.target.value)}
                />
              </label>
              <label className="rumo-settings-field">
                <span>Altura (cm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="0.1"
                  value={form.height}
                  onChange={(e) => setField('height', e.target.value)}
                />
              </label>
              <label className="rumo-settings-field">
                <span>Peso inicial (opcional)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.initialWeight}
                  onChange={(e) => setField('initialWeight', e.target.value)}
                />
              </label>
              <label className="rumo-settings-field">
                <span>Meta personalizada (opcional)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.goalWeight}
                  onChange={(e) => setField('goalWeight', e.target.value)}
                />
              </label>
              <label className="rumo-settings-field">
                <span>Nível de atividade</span>
                <select value={form.activityLevel} onChange={(e) => setField('activityLevel', e.target.value)}>
                  <option value="sedentary">Sedentário</option>
                  <option value="lightly_active">Levemente ativo</option>
                  <option value="moderately_active">Moderadamente ativo</option>
                  <option value="very_active">Muito ativo</option>
                  <option value="extremely_active">Extremamente ativo</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="rumo-settings-view-grid">
              <div className="rumo-settings-view-item">
                <span>Nome</span>
                <span>{form.name || '—'}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Sexo</span>
                <span>{sexLabel(form.sex)}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Data de nascimento</span>
                <span>{formatInputDate(form.birthDate)}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Altura</span>
                <span>{form.height ? `${form.height} cm` : '—'}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Peso inicial</span>
                <span>{form.initialWeight ? `${form.initialWeight} kg` : '—'}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Meta personalizada</span>
                <span>{form.goalWeight ? `${form.goalWeight} kg` : '—'}</span>
              </div>
              <div className="rumo-settings-view-item">
                <span>Nível de atividade</span>
                <span>{activityLevelLabel(form.activityLevel)}</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="rumo-settings-section">
          <h2 className="rumo-settings-section-title">Metas diárias</h2>
          <div className="rumo-settings-grid">
            <label className="rumo-settings-field">
              <span>Meta calórica diária (opcional)</span>
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

      <Card className="rumo-settings-section">
        <h2 className="rumo-settings-section-title">Alimentos cadastrados</h2>
        <p style={{ margin: '0 0 var(--rumo-space-4)', color: 'var(--rumo-text-secondary)' }}>
          Cadastre alimentos com as calorias por porção para registrar o consumo mais rápido.
        </p>
        <Button variant="outline" size="lg" fullWidth onClick={() => navigate('/alimentos')}>
          Gerenciar alimentos
        </Button>
      </Card>

      <Button variant="outline" size="lg" fullWidth onClick={() => void logout()} className="rumo-logout-btn">
        Sair da conta
      </Button>
    </div>
  );
}
