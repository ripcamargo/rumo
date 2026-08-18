import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useQuickRegister } from '../contexts/QuickRegisterContext';
import { useSelectedDate } from '../contexts/SelectedDateContext';
import { CalorieCard } from '../components/dashboard/CalorieCard';
import { WaterCard } from '../components/dashboard/WaterCard';
import { WeightCard } from '../components/dashboard/WeightCard';
import { ProgressCard } from '../components/dashboard/ProgressCard';
import { ExerciseCard } from '../components/dashboard/ExerciseCard';
import { DaySelector } from '../components/dashboard/DaySelector';
import { Loading } from '../components/common/Loading';
import { combineDayWithCurrentTime, getDaysAgo, getStartOfNextDay, getGreeting } from '../utils/dates';
import { calculateTrend, findClosestPoint } from '../utils/calculations';
import type { CalorieEntry, Exercise, WaterEntry, WeightEntry } from '../types';
import '../components/dashboard/cards.css';

const WEIGHT_HISTORY_DAYS = 90;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: openQuickRegister } = useQuickRegister();
  const { selectedDate, isViewingToday } = useSelectedDate();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  const today = useMemo(() => new Date(), []);
  const dayStart = selectedDate;
  const dayEnd = useMemo(() => getStartOfNextDay(selectedDate), [selectedDate]);
  const dayKey = dayStart.getTime();
  const weightSince = useMemo(() => getDaysAgo(WEIGHT_HISTORY_DAYS), []);

  const { data: calorieEntries, loading: caloriesLoading } = useFirestoreCollection<CalorieEntry>(
    user?.uid,
    'calorieEntries',
    [where('recordedAt', '>=', dayStart), where('recordedAt', '<', dayEnd)],
    dayKey,
  );

  const { data: waterEntries, loading: waterLoading } = useFirestoreCollection<WaterEntry>(
    user?.uid,
    'waterEntries',
    [where('recordedAt', '>=', dayStart), where('recordedAt', '<', dayEnd)],
    dayKey,
  );

  const { data: dayExercises, loading: exercisesLoading } = useFirestoreCollection<Exercise>(
    user?.uid,
    'exercises',
    [where('recordedAt', '>=', dayStart), where('recordedAt', '<', dayEnd)],
    dayKey,
  );

  const { data: weightEntries, loading: weightLoading } = useFirestoreCollection<WeightEntry>(
    user?.uid,
    'weightEntries',
    [where('recordedAt', '>=', weightSince)],
    weightSince.getTime(),
  );

  const loading = profileLoading || caloriesLoading || waterLoading || exercisesLoading || weightLoading;

  const caloriesConsumed = calorieEntries.reduce((sum, entry) => sum + entry.calories, 0);
  const waterConsumedMl = waterEntries.reduce((sum, entry) => sum + entry.amountMl, 0);

  const weightPoints = weightEntries.map((entry) => ({
    weight: entry.weight,
    recordedAt: entry.recordedAt.toDate(),
  }));
  const latestWeight = weightEntries[0]?.weight ?? null;
  const trend = calculateTrend(weightPoints);
  const delta14Days = (() => {
    if (!trend.hasTrend || latestWeight === null) return null;
    const target = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const closest = findClosestPoint(weightPoints, target);
    return closest ? latestWeight - closest.weight : null;
  })();

  if (loading) {
    return <Loading label="Carregando seu painel..." />;
  }

  return (
    <div>
      <header style={{ marginBottom: 'var(--rumo-space-5)' }}>
        <h1 className="rumo-page-title">
          {getGreeting()}
          {profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
        </h1>
        <DaySelector />
      </header>

      <div className="rumo-dashboard-grid">
        <CalorieCard consumed={caloriesConsumed} goal={profile?.dailyCalorieGoal ?? 0} />
        <WaterCard
          consumedMl={waterConsumedMl}
          goalMl={profile?.dailyWaterGoal ?? 0}
          recordedAt={combineDayWithCurrentTime(selectedDate)}
        />
        <WeightCard
          latestWeight={latestWeight}
          delta14Days={delta14Days}
          trend={trend}
          onRegister={() => openQuickRegister('peso')}
        />
        <ProgressCard
          initialWeight={profile?.initialWeight ?? 0}
          currentWeight={latestWeight}
          goalWeight={profile?.goalWeight ?? 0}
          onConfigureGoal={() => navigate('/configuracoes')}
        />
        <ExerciseCard
          exercises={dayExercises}
          isToday={isViewingToday}
          onRegister={() => openQuickRegister('exercicio')}
        />
      </div>
    </div>
  );
}
