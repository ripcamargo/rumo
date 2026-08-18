import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuickRegister } from '../contexts/QuickRegisterContext';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import { useRangeConstraints } from '../hooks/useRangeConstraints';
import { RangeFilter } from '../components/common/RangeFilter';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Loading } from '../components/common/Loading';
import { MeasurementChart } from '../components/charts/MeasurementChart';
import { MEASUREMENT_TYPES, type BodyMeasurement, type HistoryRangeFilter, type MeasurementType } from '../types';
import { measurementLabel } from '../utils/labels';
import '../components/dashboard/cards.css';
import '../components/registration/QuickRegister.css';
import './History.css';
import './Measurements.css';

export default function Measurements() {
  const { user } = useAuth();
  const { open: openQuickRegister } = useQuickRegister();
  const [range, setRange] = useState<HistoryRangeFilter>(90);
  const [activeType, setActiveType] = useState<MeasurementType>('cintura');
  const { constraints, depsKey } = useRangeConstraints(range);

  const { data: allEntries, loading } = useFirestoreCollection<BodyMeasurement>(
    user?.uid,
    'bodyMeasurements',
    constraints,
    depsKey,
  );

  const entriesForType = useMemo(
    () => allEntries.filter((entry) => entry.measurementType === activeType),
    [allEntries, activeType],
  );

  const sortedAsc = useMemo(
    () => [...entriesForType].sort((a, b) => a.recordedAt.toMillis() - b.recordedAt.toMillis()),
    [entriesForType],
  );
  const latest = sortedAsc[sortedAsc.length - 1] ?? null;
  const first = sortedAsc[0] ?? null;
  const delta = latest && first && latest.id !== first.id ? latest.value - first.value : null;

  return (
    <div>
      <header className="rumo-history-header">
        <h1 className="rumo-page-title">Medidas corporais</h1>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      <div className="rumo-segmented" style={{ marginBottom: 'var(--rumo-space-4)' }}>
        {MEASUREMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`rumo-segmented-item ${activeType === type ? 'rumo-segmented-item--active' : ''}`}
            onClick={() => setActiveType(type)}
          >
            {measurementLabel(type)}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="rumo-measurement-summary">
            <div>
              <span className="rumo-metric-card-label">{measurementLabel(activeType)}</span>
              <p className="rumo-metric-card-value">
                {latest ? `${latest.value.toLocaleString('pt-BR')} cm` : '—'}
              </p>
              {delta !== null && (
                <p className="rumo-weight-trend">
                  <span className="rumo-weight-trend-value">
                    {delta < 0 ? '↓' : delta > 0 ? '↑' : '→'}{' '}
                    {Math.abs(delta).toLocaleString('pt-BR')} cm
                  </span>{' '}
                  desde o início do período
                </p>
              )}
            </div>
            <Button variant="success" onClick={() => openQuickRegister('medida')}>
              + Registrar
            </Button>
          </div>
          <MeasurementChart entries={entriesForType} />
        </Card>
      )}
    </div>
  );
}
