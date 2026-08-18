import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type QuickRegisterForm = 'menu' | 'calorias' | 'agua' | 'peso' | 'medida' | 'exercicio';

interface QuickRegisterContextValue {
  isOpen: boolean;
  initialForm: QuickRegisterForm;
  open: (form?: QuickRegisterForm) => void;
  close: () => void;
}

const QuickRegisterContext = createContext<QuickRegisterContextValue | undefined>(undefined);

export function QuickRegisterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialForm, setInitialForm] = useState<QuickRegisterForm>('menu');

  const value = useMemo(
    () => ({
      isOpen,
      initialForm,
      open: (form: QuickRegisterForm = 'menu') => {
        setInitialForm(form);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [isOpen, initialForm],
  );

  return <QuickRegisterContext.Provider value={value}>{children}</QuickRegisterContext.Provider>;
}

export function useQuickRegister(): QuickRegisterContextValue {
  const context = useContext(QuickRegisterContext);
  if (!context) throw new Error('useQuickRegister deve ser usado dentro de QuickRegisterProvider');
  return context;
}
