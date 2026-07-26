import React, { createContext, useState, useContext, useCallback } from 'react';

interface UiState {
  loading: boolean;
  error: string | null;
  empty?: { title: string; message?: string } | null;
}

interface UiContextType extends UiState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEmpty: (empty: UiState['empty']) => void;
  reset: () => void;
}

const initialState: UiState = {
  loading: false,
  error: null,
  empty: null,
};

const UiContext = createContext<UiContextType | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UiState>(initialState);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setEmpty = useCallback((empty: UiState['empty']) => {
    setState((prev) => ({ ...prev, empty }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <UiContext.Provider value={{ ...state, setLoading, setError, setEmpty, reset }}>
      {children}
    </UiContext.Provider>
  );
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi debe usarse dentro de UiProvider');
  }
  return context;
}
