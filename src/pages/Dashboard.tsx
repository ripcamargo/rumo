import { useMemo, useState } from 'react';
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
import { EntryLogModal } from '../components/dashboard/EntryLogModal';
import {
  CalorieEntryEditForm,
  ExerciseEntryEditForm,
  WaterEntryEditForm,
  WeightEntryEditForm,
} from '../components/dashboard/entryEditForms';
import { Loading } from '../components/common/Loading';
import {
  deleteCalorieEntry,
  deleteExercise,
  deleteWaterEntry,
  deleteWeightEntry,
} from '../services/firebase/firestore';
import { combineDayWithCurrentTime, getDaysAgo, getStartOfNextDay, getGreeting } from '../utils/dates';
import {
  calculateAge,
  calculateBmi,
  calculateCalorieGoal,
  calculateMifflinStJeor,
  calculateReferenceWeight,
  calculateTdee,
  calculateTrend,
  classifyBmi,
  findClosestPoint,
} from '../utils/calculations';
import { mealTypeLabel } from '../utils/labels';
import type { ActivityLevel, CalorieEntry, Exercise, WaterEntry, WeightEntry } from '../types';
import '../components/dashboard/cards.css';

const WEIGHT_HISTORY_DAYS = 90;

type LogType = 'calorias' | 'agua' | 'peso' | 'exercicio' | null;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: openQuickRegister } = useQuickRegister();
  const { selectedDate, isViewingToday } = useSelectedDate();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const [logType, setLogType] = useState<LogType>(null);

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

  const todaysWeightEntries = useMemo(
    () =>
      weightEntries.filter(
        (entry) => entry.recordedAt.toMillis() >= dayStart.getTime() && entry.recordedAt.toMillis() < dayEnd.getTime(),
      ),
    [weightEntries, dayStart, dayEnd],
  );

  const weightPoints = weightEntries.map((entry) => ({
    weight: entry.weight,
    recordedAt: entry.recordedAt.toDate(),
  }));
  const latestWeight = weightEntries[0]?.weight ?? profile?.initialWeight ?? null;
  const trend = calculateTrend(weightPoints);
  const delta14Days = (() => {
    if (!trend.hasTrend || latestWeight === null) return null;
    const target = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const closest = findClosestPoint(weightPoints, target);
    return closest ? latestWeight - closest.weight : null;
  })();

  const age = profile?.birthDate ? calculateAge(profile.birthDate.toDate()) : 0;
  const heightCm = profile?.height ?? 0;
  const currentWeight = latestWeight;
  const bmi = currentWeight && heightCm ? calculateBmi(currentWeight, heightCm) : 0;
  const bmiClassification = bmi > 0 ? classifyBmi(bmi) : null;
  const suggestedGoalWeight = heightCm ? calculateReferenceWeight(heightCm) : 0;
  const activeGoalWeight = profile?.goalWeight && profile.goalWeight > 0 ? profile.goalWeight : suggestedGoalWeight;
  const activityLevel: ActivityLevel = profile?.activityLevel ?? 'moderately_active';
  const bmr = currentWeight && heightCm && age && profile?.sex
    ? calculateMifflinStJeor({ sex: profile.sex, weightKg: currentWeight, heightCm, ageYears: age })
    : 0;
  const tdee = bmr > 0 ? calculateTdee(bmr, activityLevel) : 0;
  const dailyCalorieGoal = profile?.dailyCalorieGoal && profile.dailyCalorieGoal > 0 ? profile.dailyCalorieGoal : (tdee > 0 ? calculateCalorieGoal(tdee) : 0);

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
        <CalorieCard
          consumed={caloriesConsumed}
          goal={dailyCalorieGoal}
          onOpenLog={() => setLogType('calorias')}
        />
        <WaterCard
          consumedMl={waterConsumedMl}
          goalMl={profile?.dailyWaterGoal ?? 0}
          recordedAt={combineDayWithCurrentTime(selectedDate)}
          onOpenLog={() => setLogType('agua')}
        />
        <WeightCard
          latestWeight={latestWeight}
          delta14Days={delta14Days}
          trend={trend}
          onRegister={() => openQuickRegister('peso')}
          onOpenLog={() => setLogType('peso')}
        />
        <ProgressCard
          initialWeight={profile?.initialWeight && profile.initialWeight > 0 ? profile.initialWeight : currentWeight ?? 0}
          currentWeight={currentWeight}
          goalWeight={activeGoalWeight}
          suggestedGoalWeight={suggestedGoalWeight > 0 ? suggestedGoalWeight : null}
          bmi={bmi > 0 ? bmi : null}
          bmiClassification={bmiClassification}
          tmb={bmr > 0 ? bmr : null}
          tdee={tdee > 0 ? tdee : null}
          dailyCalorieGoal={dailyCalorieGoal > 0 ? dailyCalorieGoal : null}
          hasCustomGoal={Boolean(profile?.goalWeight && profile.goalWeight > 0)}
          onConfigureGoal={() => navigate('/configuracoes')}
        />
        <ExerciseCard
          exercises={dayExercises}
          isToday={isViewingToday}
          onRegister={() => openQuickRegister('exercicio')}
          onOpenLog={() => setLogType('exercicio')}
        />
      </div>

      {user && (
        <>
          <EntryLogModal<CalorieEntry>
            open={logType === 'calorias'}
            onClose={() => setLogType(null)}
            title="Calorias do dia"
            icon="🔥"
            entries={calorieEntries}
            emptyMessage="Nenhuma caloria registrada neste dia."
            renderSummary={(entry) => (
              <>
                {entry.calories} kcal
                {entry.mealType && ` · ${mealTypeLabel(entry.mealType)}`}
                {entry.mealName && ` · ${entry.mealName}`}
              </>
            )}
            renderEditForm={(entry, onDone) => <CalorieEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteCalorieEntry(user.uid, entry.id)}
          />
          <EntryLogModal<WaterEntry>
            open={logType === 'agua'}
            onClose={() => setLogType(null)}
            title="Água do dia"
            icon="💧"
            entries={waterEntries}
            emptyMessage="Nenhum registro de água neste dia."
            renderSummary={(entry) => <>{entry.amountMl} ml</>}
            renderEditForm={(entry, onDone) => <WaterEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteWaterEntry(user.uid, entry.id)}
          />
          <EntryLogModal<WeightEntry>
            open={logType === 'peso'}
            onClose={() => setLogType(null)}
            title="Peso do dia"
            icon="⚖️"
            entries={todaysWeightEntries}
            emptyMessage="Nenhum peso registrado neste dia."
            renderSummary={(entry) => (
              <>{entry.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg</>
            )}
            renderEditForm={(entry, onDone) => <WeightEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteWeightEntry(user.uid, entry.id)}
          />
          <EntryLogModal<Exercise>
            open={logType === 'exercicio'}
            onClose={() => setLogType(null)}
            title="Exercícios do dia"
            icon="🏃"
            entries={dayExercises}
            emptyMessage="Nenhum exercício registrado neste dia."
            renderSummary={(entry) => (
              <>
                {entry.activity} · {entry.durationMinutes} min
              </>
            )}
            renderEditForm={(entry, onDone) => <ExerciseEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteExercise(user.uid, entry.id)}
          />
        </>
      )}
    </div>
  );
}
