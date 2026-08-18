import { useRef } from 'react';
import type { TouchEvent } from 'react';
import { useSelectedDate } from '../../contexts/SelectedDateContext';
import { addDays, formatDate } from '../../utils/dates';
import './DaySelector.css';

const SWIPE_THRESHOLD_PX = 40;

export function DaySelector() {
  const { selectedDate, setSelectedDate, isViewingToday, resetToToday } = useSelectedDate();
  const touchStartX = useRef<number | null>(null);

  function goToPreviousDay() {
    setSelectedDate(addDays(selectedDate, -1));
  }

  function goToNextDay() {
    if (isViewingToday) return;
    setSelectedDate(addDays(selectedDate, 1));
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (deltaX > 0) {
      goToPreviousDay();
    } else {
      goToNextDay();
    }
  }

  return (
    <div
      className="rumo-day-selector"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="rumo-day-selector-arrow"
        aria-label="Dia anterior"
        onClick={goToPreviousDay}
      >
        ‹
      </button>
      <span className="rumo-day-selector-label">
        <span>{formatDate(selectedDate)}</span>
        {!isViewingToday && (
          <button type="button" className="rumo-day-selector-today-btn" onClick={resetToToday}>
            Voltar para hoje
          </button>
        )}
      </span>
      <button
        type="button"
        className="rumo-day-selector-arrow"
        aria-label="Próximo dia"
        onClick={goToNextDay}
        disabled={isViewingToday}
      >
        ›
      </button>
    </div>
  );
}
