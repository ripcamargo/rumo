import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuickRegister } from '../contexts/QuickRegisterContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useRangeConstraints } from '../hooks/useRangeConstraints';
import { RangeFilter } from '../components/common/RangeFilter';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { EmptyState } from '../components/common/EmptyState';
import { formatShortDate } from '../utils/dates';
import type { Exercise, HistoryRangeFilter } from '../types';
import '../components/dashboard/cards.css';
import './History.css';

export default function Exercises() {
  const { user } = useAuth();
  const { open: openQuickRegister } = useQuickRegister();
  const [range, setRange] = useState<HistoryRangeFilter>(30);
  const { constraints, depsKey } = useRangeConstraints(range);

  const { data: exercises, loading } = useFirestoreCollection<Exercise>(
    user?.uid,
    'exercises',
    constraints,
    depsKey,
  );

  const totalMinutes = exercises.reduce((sum, e) => sum + e.durationMinutes, 0);

  return (
    <div>
      <header className="rumo-history-header">
        <h1 className="rumo-page-title">Exercícios</h1>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--rumo-space-4)' }}>
        <Button variant="success" onClick={() => openQuickRegister('exercicio')}>
          + Registrar exercício
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : exercises.length === 0 ? (
        <Card>
          <EmptyState
            icon="🏃"
            title="Nenhum exercício registrado neste período."
            description="Registre suas atividades para acompanhar sua rotina."
          />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 'var(--rumo-space-4)' }}>
            <span className="rumo-metric-card-label">Total no período</span>
            <p className="rumo-metric-card-value">{totalMinutes} min</p>
          </Card>
          <Card>
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
                  <span className="rumo-exercise-item-duration">{exercise.durationMinutes} min</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
