import { EntradaRow, EventoRow, TicketsRepository, Usuario } from './tickets.repository';

/** Repositorio en memoria para las pruebas de los servicios (mismo contrato que el de Supabase). */
export function fakeRepository(seed: { eventos?: EventoRow[]; staff?: Array<{ eventoId: string; usuarioId: string }> } = {}) {
  const eventos = new Map((seed.eventos ?? []).map((e) => [e.id, { ...e }]));
  const entradas: EntradaRow[] = [];
  const accesos: string[] = [];
  const repo: TicketsRepository = {
    async getEvento(id) {
      return eventos.get(id) ?? null;
    },
    async emitirEntrada(input) {
      const existing = entradas.find((e) => e.payment_intent_id === input.paymentIntentId);
      if (existing) return existing;
      const evento = eventos.get(input.eventoId);
      if (!evento) throw new Error('evento_no_encontrado');
      if (evento.entradas_disponibles <= 0) throw new Error('sin_entradas');
      evento.entradas_disponibles -= 1;
      const entrada: EntradaRow = {
        id: input.id, evento_id: input.eventoId, usuario_id: input.usuarioId, codigo_qr: input.codigoQr, asiento: input.asiento,
        precio_pagado: input.precio, estado: 'VALIDO', payment_intent_id: input.paymentIntentId,
      };
      entradas.push(entrada);
      return entrada;
    },
    async getEntradaPorPago(pi) {
      return entradas.find((e) => e.payment_intent_id === pi) ?? null;
    },
    async getEntradaPorQr(qr) {
      return entradas.find((e) => e.codigo_qr === qr) ?? null;
    },
    async marcarUsada(id, por) {
      const entrada = entradas.find((e) => e.id === id && e.estado === 'VALIDO');
      if (!entrada) return null;
      entrada.estado = 'USADO';
      entrada.escaneado_por = por;
      return { ...entrada };
    },
    async registrarAcceso({ entrada }) {
      accesos.push(entrada.id);
    },
    async puedeEscanear(usuario: Usuario, eventoId) {
      if (usuario.rol === 'super_admin') return true;
      if (eventos.get(eventoId)?.artista_id === usuario.id) return true;
      return (seed.staff ?? []).some((s) => s.eventoId === eventoId && s.usuarioId === usuario.id);
    },
  };
  return { repo, eventos, entradas, accesos };
}
