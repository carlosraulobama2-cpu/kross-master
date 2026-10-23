import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from './api';
import { useToast } from '../components/ui';

/** Listado paginado con filtros; vuelve a la página 1 al cambiar un filtro. */
export function useListado<T, F extends Record<string, string>>(clave: string, ruta: string, campo: string, filtrosIniciales: F, porPagina = 20) {
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltrosState] = useState<F>(filtrosIniciales);
  const consulta = useQuery({
    queryKey: [clave, pagina, filtros],
    queryFn: async () => {
      const r = await api<Record<string, unknown> & { total: number }>(ruta, { query: { ...filtros, pagina, porPagina } });
      return { items: r[campo] as T[], total: r.total };
    },
    placeholderData: keepPreviousData,
  });
  const setFiltro = <K extends keyof F>(k: K, v: F[K]) => {
    setFiltrosState((f) => ({ ...f, [k]: v }));
    setPagina(1);
  };
  return { ...consulta, pagina, setPagina, filtros, setFiltro, porPagina };
}

/** Mutación que avisa del resultado y refresca las consultas indicadas. */
export function useAccion<V>(fn: (v: V) => Promise<unknown>, { exito, invalidar }: { exito: string; invalidar: string[] }) {
  const qc = useQueryClient();
  const avisar = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      avisar('exito', exito);
      for (const k of invalidar) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => avisar('error', e instanceof Error ? e.message : 'Algo ha fallado'),
  });
}

export { api };
