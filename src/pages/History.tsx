import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useRangeConstraints } from '../hooks/useRangeConstraints';
import { RangeFilter } from '../components/common/RangeFilter';
import { Card } from '../components/common/Card';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { WeightChart } from '../components/charts/WeightChart';
import { DailyBarChart } from '../components/charts/DailyBarChart';
import { EntryLogModal } from '../components/dashboard/EntryLogModal';
import {
  CalorieEntryEditForm,
  ExerciseEntryEditForm,
  WaterEntryEditForm,
  WeightEntryEditForm,
} from '../components/dashboard/entryEditForms';
import {
  deleteCalorieEntry,
  deleteExercise,
  deleteWaterEntry,
  deleteWeightEntry,
} from '../services/firebase/firestore';
import { groupByDayTotal } from '../utils/aggregations';
import { formatShortDate } from '../utils/dates';
import { mealTypeLabel } from '../utils/labels';
import type { CalorieEntry, Exercise, HistoryRangeFilter, WaterEntry, WeightEntry } from '../types';
import '../components/dashboard/cards.css';
import './History.css';

type LogType = 'peso' | 'calorias' | 'agua' | null;

function ClickableChart({
  enabled,
  onOpen,
  children,
}: {
  enabled: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <div
      className="rumo-history-chart-trigger"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {children}
    </div>
  );
}

export default function History() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [range, setRange] = useState<HistoryRangeFilter>(30);
  const [logType, setLogType] = useState<LogType>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);
  const { constraints, depsKey } = useRangeConstraints(range);

  const { data: weightEntries, loading: weightLoading } = useFirestoreCollection<WeightEntry>(
    user?.uid,
    'weightEntries',
    constraints,
    depsKey,
  );
  const { data: calorieEntries, loading: caloriesLoading } = useFirestoreCollection<CalorieEntry>(
    user?.uid,
    'calorieEntries',
    constraints,
    depsKey,
  );
  const { data: waterEntries, loading: waterLoading } = useFirestoreCollection<WaterEntry>(
    user?.uid,
    'waterEntries',
    constraints,
    depsKey,
  );
  const { data: exercises, loading: exercisesLoading } = useFirestoreCollection<Exercise>(
    user?.uid,
    'exercises',
    constraints,
    depsKey,
  );

  const loading = weightLoading || caloriesLoading || waterLoading || exercisesLoading;

  const weightPoints = weightEntries.map((entry) => ({
    weight: entry.weight,
    recordedAt: entry.recordedAt.toDate(),
  }));
  const calorieDailyTotals = groupByDayTotal(calorieEntries, (entry) => entry.calories);
  const waterDailyTotals = groupByDayTotal(waterEntries, (entry) => entry.amountMl);

  async function handleDeleteExercise(exercise: Exercise) {
    if (!user) return;
    setDeletingExerciseId(exercise.id);
    try {
      await deleteExercise(user.uid, exercise.id);
      showToast('Registro removido');
    } catch {
      showToast('Não foi possível remover agora. Tente novamente.', 'error');
    } finally {
      setDeletingExerciseId(null);
    }
  }

  return (
    <div>
      <header className="rumo-history-header">
        <h1 className="rumo-page-title">Histórico</h1>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {loading ? (
        <Loading />
      ) : (
        <div className="rumo-history-sections">
          <Card>
            <div className="rumo-history-section-header">
              <h2 className="rumo-history-section-title">Peso</h2>
              {weightEntries.length > 0 && (
                <button type="button" className="rumo-form-link" onClick={() => setLogType('peso')}>
                  Editar registros
                </button>
              )}
            </div>
            <ClickableChart enabled={weightEntries.length > 0} onOpen={() => setLogType('peso')}>
              <WeightChart points={weightPoints} />
            </ClickableChart>
          </Card>

          <Card>
            <div className="rumo-history-section-header">
              <h2 className="rumo-history-section-title">Calorias</h2>
              {calorieEntries.length > 0 && (
                <button type="button" className="rumo-form-link" onClick={() => setLogType('calorias')}>
                  Editar registros
                </button>
              )}
            </div>
            <ClickableChart enabled={calorieEntries.length > 0} onOpen={() => setLogType('calorias')}>
              <DailyBarChart
                data={calorieDailyTotals}
                color="var(--rumo-navy)"
                unit="kcal"
                emptyTitle="Sem registros de calorias neste período."
                emptyDescription="Registre suas refeições para ver o histórico."
              />
            </ClickableChart>
          </Card>

          <Card>
            <div className="rumo-history-section-header">
              <h2 className="rumo-history-section-title">Água</h2>
              {waterEntries.length > 0 && (
                <button type="button" className="rumo-form-link" onClick={() => setLogType('agua')}>
                  Editar registros
                </button>
              )}
            </div>
            <ClickableChart enabled={waterEntries.length > 0} onOpen={() => setLogType('agua')}>
              <DailyBarChart
                data={waterDailyTotals}
                color="var(--rumo-mint)"
                unit="ml"
                emptyTitle="Sem registros de água neste período."
                emptyDescription="Registre sua água para ver o histórico."
              />
            </ClickableChart>
          </Card>

          <Card>
            <h2 className="rumo-history-section-title">Exercícios</h2>
            {exercises.length === 0 ? (
              <EmptyState icon="🏃" title="Sem exercícios registrados neste período." />
            ) : (
              <ul className="rumo-log-list">
                {exercises.map((exercise) => (
                  <li key={exercise.id} className="rumo-log-item">
                    {editingExerciseId === exercise.id ? (
                      <ExerciseEntryEditForm entry={exercise} onDone={() => setEditingExerciseId(null)} />
                    ) : (
                      <>
                        <div>
                          <span className="rumo-log-item-summary">
                            {exercise.activity} · {exercise.durationMinutes} min
                          </span>
                          <span className="rumo-log-item-time">
                            {formatShortDate(exercise.recordedAt.toDate())}
                          </span>
                        </div>
                        <div className="rumo-log-item-actions">
                          <button
                            type="button"
                            className="rumo-log-item-action"
                            aria-label="Editar registro"
                            onClick={() => setEditingExerciseId(exercise.id)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="rumo-log-item-action"
                            aria-label="Remover registro"
                            disabled={deletingExerciseId === exercise.id}
                            onClick={() => void handleDeleteExercise(exercise)}
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {user && (
        <>
          <EntryLogModal<WeightEntry>
            open={logType === 'peso'}
            onClose={() => setLogType(null)}
            title="Registros de peso"
            icon="⚖️"
            entries={weightEntries}
            emptyMessage="Nenhum peso registrado neste período."
            renderSummary={(entry) => (
              <>
                {entry.weight.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
                <span className="rumo-history-exercise-date">
                  {' '}
                  · {formatShortDate(entry.recordedAt.toDate())}
                </span>
              </>
            )}
            renderEditForm={(entry, onDone) => <WeightEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteWeightEntry(user.uid, entry.id)}
          />
          <EntryLogModal<CalorieEntry>
            open={logType === 'calorias'}
            onClose={() => setLogType(null)}
            title="Registros de calorias"
            icon="🔥"
            entries={calorieEntries}
            emptyMessage="Nenhuma caloria registrada neste período."
            renderSummary={(entry) => (
              <>
                {entry.calories} kcal
                {entry.mealType && ` · ${mealTypeLabel(entry.mealType)}`}
                {entry.mealName && ` · ${entry.mealName}`}
                <span className="rumo-history-exercise-date">
                  {' '}
                  · {formatShortDate(entry.recordedAt.toDate())}
                </span>
              </>
            )}
            renderEditForm={(entry, onDone) => <CalorieEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteCalorieEntry(user.uid, entry.id)}
          />
          <EntryLogModal<WaterEntry>
            open={logType === 'agua'}
            onClose={() => setLogType(null)}
            title="Registros de água"
            icon="💧"
            entries={waterEntries}
            emptyMessage="Nenhum registro de água neste período."
            renderSummary={(entry) => (
              <>
                {entry.amountMl} ml
                <span className="rumo-history-exercise-date">
                  {' '}
                  · {formatShortDate(entry.recordedAt.toDate())}
                </span>
              </>
            )}
            renderEditForm={(entry, onDone) => <WaterEntryEditForm entry={entry} onDone={onDone} />}
            onDelete={(entry) => deleteWaterEntry(user.uid, entry.id)}
          />
        </>
      )}
    </div>
  );
}
