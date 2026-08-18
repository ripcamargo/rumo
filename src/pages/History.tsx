import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useRangeConstraints } from '../hooks/useRangeConstraints';
import { RangeFilter } from '../components/common/RangeFilter';
import { Card } from '../components/common/Card';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { WeightChart } from '../components/charts/WeightChart';
import { DailyBarChart } from '../components/charts/DailyBarChart';
import { groupByDayTotal } from '../utils/aggregations';
import { formatShortDate } from '../utils/dates';
import type { CalorieEntry, Exercise, HistoryRangeFilter, WaterEntry, WeightEntry } from '../types';
import '../components/dashboard/cards.css';
import './History.css';

export default function History() {
  const { user } = useAuth();
  const [range, setRange] = useState<HistoryRangeFilter>(30);
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
            <h2 className="rumo-history-section-title">Peso</h2>
            <WeightChart points={weightPoints} />
          </Card>

          <Card>
            <h2 className="rumo-history-section-title">Calorias</h2>
            <DailyBarChart
              data={calorieDailyTotals}
              color="var(--rumo-navy)"
              unit="kcal"
              emptyTitle="Sem registros de calorias neste período."
              emptyDescription="Registre suas refeições para ver o histórico."
            />
          </Card>

          <Card>
            <h2 className="rumo-history-section-title">Água</h2>
            <DailyBarChart
              data={waterDailyTotals}
              color="var(--rumo-mint)"
              unit="ml"
              emptyTitle="Sem registros de água neste período."
              emptyDescription="Registre sua água para ver o histórico."
            />
          </Card>

          <Card>
            <h2 className="rumo-history-section-title">Exercícios</h2>
            {exercises.length === 0 ? (
              <EmptyState icon="🏃" title="Sem exercícios registrados neste período." />
            ) : (
              <ul className="rumo-exercise-list">
                {exercises.map((exercise) => (
                  <li key={exercise.id} className="rumo-exercise-item">
                    <span className="rumo-exercise-item-activity">
                      {exercise.activity}
                      <span className="rumo-history-exercise-date">
                        {' '}
                        · {formatShortDate(exercise.recordedAt.toDate())}
                      </span>
                    </span>
                    <span className="rumo-exercise-item-duration">
                      {exercise.durationMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
