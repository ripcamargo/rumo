import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getStartOfToday, isToday } from '../utils/dates';

interface SelectedDateContextValue {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  isViewingToday: boolean;
  resetToToday: () => void;
}

const SelectedDateContext = createContext<SelectedDateContextValue | undefined>(undefined);

/**
 * Dia sendo visualizado/editado no Dashboard. Compartilhado com o
 * QuickRegister para que registros feitos a partir de um dia passado
 * sejam salvos naquele dia, não em "agora".
 */
export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => getStartOfToday());

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      isViewingToday: isToday(selectedDate),
      resetToToday: () => setSelectedDate(getStartOfToday()),
    }),
    [selectedDate],
  );

  return <SelectedDateContext.Provider value={value}>{children}</SelectedDateContext.Provider>;
}

export function useSelectedDate(): SelectedDateContextValue {
  const context = useContext(SelectedDateContext);
  if (!context) throw new Error('useSelectedDate deve ser usado dentro de SelectedDateProvider');
  return context;
}
