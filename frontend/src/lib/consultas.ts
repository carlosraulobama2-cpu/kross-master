import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Categoria } from '../theme';
import { api } from './api';
import { useAuth } from './auth';
import type {
  ConfigPublica,
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

export const useEvento = (id: string) =>
  useQuery({ queryKey: ['evento', id], queryFn: () => api<{ evento: EventoDetalle }>(`/eventos/${id}`).then((r) => r.evento) });

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
      const previo = qc.getQueryData<EventoDetalle>(['evento', eventoId]);
      if (previo) qc.setQueryData(['evento', eventoId], { ...previo, favorito: marcar });
      return { previo };
    },
    onError: (_e, _v, ctx) => ctx?.previo && qc.setQueryData(['evento', eventoId], ctx.previo),
    onSettled: () => qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('favoritos') }),
  });
}

export const invalidarYo = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ['yo'] });
