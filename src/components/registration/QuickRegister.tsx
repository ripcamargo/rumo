import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { CalorieForm } from './CalorieForm';
import { WaterForm } from './WaterForm';
import { WeightForm } from './WeightForm';
import { MeasurementForm } from './MeasurementForm';
import { ExerciseForm } from './ExerciseForm';
import { useQuickRegister, type QuickRegisterForm } from '../../contexts/QuickRegisterContext';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { formatDate } from '../../utils/dates';
import './QuickRegister.css';

type FormKey = QuickRegisterForm;

const OPTIONS: { key: FormKey; icon: string; label: string }[] = [
  { key: 'calorias', icon: '🔥', label: 'Calorias' },
  { key: 'agua', icon: '💧', label: 'Água' },
  { key: 'peso', icon: '⚖️', label: 'Peso' },
  { key: 'medida', icon: '📏', label: 'Medida' },
  { key: 'exercicio', icon: '🏃', label: 'Exercício' },
];

const TITLES: Record<FormKey, string> = {
  menu: 'Registrar',
  calorias: 'Registrar calorias',
  agua: 'Registrar água',
  peso: 'Registrar peso',
  medida: 'Registrar medida',
  exercicio: 'Registrar exercício',
};

export function QuickRegister() {
  const { isOpen, initialForm, close } = useQuickRegister();
  const { selectedDate, isViewingToday } = useSelectedDate();
  const [active, setActive] = useState<FormKey>('menu');

  useEffect(() => {
    if (isOpen) setActive(initialForm);
  }, [isOpen, initialForm]);

  function handleDone() {
    close();
  }

  return (
    <Modal open={isOpen} onClose={close} title={TITLES[active]}>
      {!isViewingToday && (
        <p className="rumo-quick-register-date-notice">
          Registrando para {formatDate(selectedDate).toLowerCase()}
        </p>
      )}
      {active === 'menu' && (
        <div className="rumo-quick-register-grid">
          {OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className="rumo-quick-register-option"
              onClick={() => setActive(option.key)}
            >
              <span className="rumo-quick-register-option-icon">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
      {active === 'calorias' && <CalorieForm onDone={handleDone} />}
      {active === 'agua' && <WaterForm onDone={handleDone} />}
      {active === 'peso' && <WeightForm onDone={handleDone} />}
      {active === 'medida' && <MeasurementForm onDone={handleDone} />}
      {active === 'exercicio' && <ExerciseForm onDone={handleDone} />}
    </Modal>
  );
}
