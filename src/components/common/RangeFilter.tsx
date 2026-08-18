import type { HistoryRangeFilter } from '../../types';
import './RangeFilter.css';

const OPTIONS: { value: HistoryRangeFilter; label: string }[] = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 'all', label: 'Tudo' },
];

export function RangeFilter({
  value,
  onChange,
}: {
  value: HistoryRangeFilter;
  onChange: (value: HistoryRangeFilter) => void;
}) {
  return (
    <div className="rumo-range-filter" role="tablist">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={`rumo-range-filter-item ${value === option.value ? 'rumo-range-filter-item--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
