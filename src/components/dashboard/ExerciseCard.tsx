import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import type { Exercise } from '../../types';
import './cards.css';

export function ExerciseCard({
  exercises,
  isToday,
  onRegister,
}: {
  exercises: Exercise[];
  isToday: boolean;
  onRegister: () => void;
}) {
  return (
    <Card className="rumo-metric-card">
      <div className="rumo-metric-card-header">
        <span className="rumo-metric-card-label">{isToday ? 'Exercícios de hoje' : 'Exercícios do dia'}</span>
        <span className="rumo-metric-card-emoji" aria-hidden="true">
          🏃
        </span>
      </div>
      {exercises.length === 0 ? (
        <EmptyState
          icon="🏃"
          title={isToday ? 'Nenhum exercício hoje.' : 'Nenhum exercício neste dia.'}
          description="Registre uma atividade rápida assim que se mexer."
          action={
            <button type="button" className="rumo-water-quick-btn" onClick={onRegister}>
              Registrar exercício
            </button>
          }
        />
      ) : (
        <ul className="rumo-exercise-list">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="rumo-exercise-item">
              <span className="rumo-exercise-item-activity">{exercise.activity}</span>
              <span className="rumo-exercise-item-duration">{exercise.durationMinutes} min</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
