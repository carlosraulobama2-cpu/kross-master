import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ca } from './idiomas/ca';
import { en } from './idiomas/en';

/**
 * Idiomas de la app. El texto en español es la clave: si falta una traducción
 * se muestra en español, así nunca aparece una clave vacía.
 */
export type Idioma = 'es' | 'en' | 'ca';
export const IDIOMAS: { id: Idioma; nombre: string }[] = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
  { id: 'ca', nombre: 'Català' },
];

const DICCIONARIOS: Record<Idioma, Record<string, string>> = { es: {}, en, ca };
const LOCALES: Record<Idioma, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES' };
const CLAVE = 'km.idioma';

let actual: Idioma = 'es';

/** Locale para fechas y precios (Intl). */
export const locale = () => LOCALES[actual];

type Vars = Record<string, string | number>;

/** Traduce fuera de componentes (formato de fechas, avisos…). */
export function traducir(texto: string, vars?: Vars): string {
  const base = DICCIONARIOS[actual][texto] ?? texto;
  return vars ? base.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : base;
}

function idiomaDelDispositivo(): Idioma {
  try {
    const l = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (l.startsWith('ca')) return 'ca';
    if (l.startsWith('en')) return 'en';
  } catch {
    // Sin Intl completo: español.
  }
  return 'es';
}

const Contexto = createContext<{ idioma: Idioma; cambiar: (i: Idioma) => void; t: typeof traducir }>({
  idioma: 'es',
  cambiar: () => undefined,
  t: traducir,
});

export function IdiomaProvider({ children }: { children: (idioma: Idioma) => ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE)
      .then((v) => (v === 'es' || v === 'en' || v === 'ca' ? v : idiomaDelDispositivo()))
      .catch(() => idiomaDelDispositivo())
      .then((i) => {
        actual = i;
        setIdioma(i);
      });
  }, []);

  const cambiar = useCallback((i: Idioma) => {
    actual = i;
    setIdioma(i);
    void AsyncStorage.setItem(CLAVE, i).catch(() => undefined);
  }, []);

  // `t` cambia de identidad con el idioma para que los memo se recalculen.
  const valor = useMemo(() => ({ idioma: idioma ?? 'es', cambiar, t: (texto: string, vars?: Vars) => traducir(texto, vars) }), [idioma, cambiar]);
  if (!idioma) return null;
  return <Contexto.Provider value={valor}>{children(idioma)}</Contexto.Provider>;
}

export const useT = () => useContext(Contexto);
