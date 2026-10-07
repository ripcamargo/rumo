import { addMonths, formatMonthLabel, toMonthKey } from '../../utils/finance';
import './finance.css';

export function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const currentMonth = toMonthKey(new Date());
  return (
    <div className="rumo-month-nav">
      <button
        type="button"
        className="rumo-month-nav-btn"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(month, -1))}
      >
        ‹
      </button>
      <div className="rumo-month-nav-label">
        <span>{formatMonthLabel(month)}</span>
        {month !== currentMonth && (
          <button type="button" className="rumo-form-link" onClick={() => onChange(currentMonth)}>
            Voltar para o mês atual
          </button>
        )}
      </div>
      <button
        type="button"
        className="rumo-month-nav-btn"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
      >
        ›
      </button>
    </div>
  );
}
