import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Categoria } from '../theme';
import { api } from './api';
import { useAuth } from './auth';
import type {
  Artista,
  CodigoPromocional,
  ConfigPublica,
  PedidoResumen,
  Recinto,
  Entrada,
  EventoDetalle,
  EventoGestion,
  EventoOrganizador,
  EventoResumen,
  Notificacion,
  Pedido,
  Transferencia,
} from './tipos';

export interface FiltrosEventos {
  q?: string;
  categoria?: string;
  ciudad?: string;
  destacados?: boolean;
  orden?: 'fecha' | 'precio' | 'recientes';
  hasta?: string;
}

const POR_PAGINA = 12;

export function useEventos(filtros: FiltrosEventos) {
  return useInfiniteQuery({
    queryKey: ['eventos', filtros],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<{ eventos: EventoResumen[]; total: number; pagina: number }>('/eventos', {
        query: { ...filtros, destacados: filtros.destacados ? 'true' : undefined, pagina: pageParam, porPagina: POR_PAGINA },
      }),
    getNextPageParam: (ultima) => (ultima.pagina * POR_PAGINA < ultima.total ? ultima.pagina + 1 : undefined),
  });
}

export const useCiudades = () =>
  useQuery({
    queryKey: ['ciudades'],
    queryFn: () => api<{ ciudades: { nombre: string; eventos: number }[] }>('/eventos/ciudades').then((r) => r.ciudades),
    staleTime: 5 * 60_000,
  });

/** Con `acceso` se desbloquean los tipos de entrada de preventa. */
export const useEvento = (id: string, acceso?: string) =>
  useQuery({
    queryKey: ['evento', id, acceso ?? null],
    queryFn: () => api<{ evento: EventoDetalle }>(`/eventos/${id}`, { query: { acceso } }).then((r) => r.evento),
    placeholderData: keepPreviousData,
  });

export const useArtista = (id: string) =>
  useQuery({ queryKey: ['artista', id], queryFn: () => api<{ artista: Artista }>(`/artistas/${id}`).then((r) => r.artista) });

export const useRecinto = (id: string) =>
  useQuery({ queryKey: ['recinto', id], queryFn: () => api<{ recinto: Recinto }>(`/recintos/${id}`).then((r) => r.recinto) });

export const useConfig = () =>
  useQuery({ queryKey: ['config'], queryFn: () => api<{ config: ConfigPublica }>('/config').then((r) => r.config), staleTime: 5 * 60_000 });

/** Consultas privadas: solo con sesión. La clave empieza por 'yo' para limpiarlas al salir. */
function usePrivada<T>(clave: unknown[], fn: () => Promise<T>, extra: { refetchInterval?: number } = {}) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ['yo', usuario?.id, ...clave], queryFn: fn, enabled: Boolean(usuario), ...extra });
}

export const useEntradas = () => usePrivada(['entradas'], () => api<{ entradas: Entrada[] }>('/entradas').then((r) => r.entradas));
export const useEntrada = (id: string) => usePrivada(['entrada', id], () => api<{ entrada: Entrada }>(`/entradas/${id}`).then((r) => r.entrada));
export const useTransferencias = () =>
  usePrivada(['transferencias'], () => api<{ recibidas: Transferencia[]; enviadas: Transferencia[] }>('/transferencias'));
export const useFavoritos = () => usePrivada(['favoritos'], () => api<{ eventos: EventoResumen[] }>('/me/favoritos').then((r) => r.eventos));
export const useNotificaciones = () =>
  usePrivada(['notificaciones'], () => api<{ notificaciones: Notificacion[] }>('/me/notificaciones').then((r) => r.notificaciones));
export const usePedido = (id: string, sondear: boolean) =>
  usePrivada(['pedido', id], () => api<{ pedido: Pedido }>(`/pedidos/${id}`).then((r) => r.pedido), { refetchInterval: sondear ? 1500 : undefined });

export const usePedidos = () => usePrivada(['pedidos'], () => api<{ pedidos: PedidoResumen[] }>('/pedidos').then((r) => r.pedidos));
export const useSiguiendo = () =>
  usePrivada(['siguiendo'], () =>
    api<{ artistas: { id: string; nombre: string; imagen_url: string | null }[]; recintos: { id: string; nombre: string; ciudad: string; imagen_url: string | null }[] }>('/me/siguiendo'),
  );
export const useCodigosEvento = (id: string) =>
  usePrivada(['organizador', 'codigos', id], () => api<{ codigos: CodigoPromocional[] }>(`/organizador/eventos/${id}/codigos`).then((r) => r.codigos));

export const useMisEventos = () =>
  usePrivada(['organizador', 'eventos'], () => api<{ eventos: EventoOrganizador[] }>('/organizador/eventos', { query: { porPagina: 100 } }).then((r) => r.eventos));
export const useEventoGestion = (id: string) =>
  usePrivada(['organizador', 'evento', id], () => api<{ evento: EventoGestion }>(`/organizador/eventos/${id}`).then((r) => r.evento));
export const useEventosPuerta = () =>
  usePrivada(['puerta'], () => api<{ eventos: { id: string; titulo: string; categoria: Categoria; inicia_en: string; recinto: string; ciudad: string; imagen_url: string | null }[] }>('/puerta/eventos').then((r) => r.eventos));

/** Favorito con actualización optimista: el corazón responde al instante. */
export function useFavorito(eventoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (marcar: boolean) => api(`/eventos/${eventoId}/favorito`, { method: marcar ? 'PUT' : 'DELETE' }),
    onMutate: async (marcar) => {
      await qc.cancelQueries({ queryKey: ['evento', eventoId] });
      const previos = qc.getQueriesData<EventoDetalle>({ queryKey: ['evento', eventoId] });
      for (const [clave, datos] of previos) if (datos) qc.setQueryData(clave, { ...datos, favorito: marcar });
      return { previos };
    },
    onError: (_e, _v, ctx) => ctx?.previos.forEach(([clave, datos]) => qc.setQueryData(clave, datos)),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('favoritos') }),
  });
}

export const invalidarYo = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['yo'] });
