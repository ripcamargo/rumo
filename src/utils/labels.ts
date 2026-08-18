import type { MeasurementType } from '../types';

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  cintura: 'Cintura',
  abdomen: 'Abdômen',
  peito: 'Peito',
  quadril: 'Quadril',
  braco: 'Braço',
  coxa: 'Coxa',
};

export function measurementLabel(type: MeasurementType): string {
  return MEASUREMENT_LABELS[type];
}
