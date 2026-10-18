import { supabase } from '../../config/supabase';
import { AppError, conflict, notFound } from '../../common/errors';
import { RequestWithUser } from '../../middleware/auth';

export interface EventoRow {
  id: string;
  titulo?: string;
  precio: number;
  entradas_disponibles: number;
  fecha_evento?: string | null;
  artista_id?: string | null;
}

export interface EntradaRow {
  id: string;
  evento_id: string;
  usuario_id: string;
  codigo_qr: string;
  asiento: string | null;
  precio_pagado: number;
  estado: string;
  payment_intent_id: string | null;
  escaneado_por?: string | null;
  fecha_escaneo?: string | null;
}

export type Usuario = NonNullable<RequestWithUser['usuario']>;

/** Acceso a datos de eventos y entradas. Los servicios dependen de esta interfaz, así se prueban sin base de datos. */
export interface TicketsRepository {
  getEvento(id: string): Promise<EventoRow | null>;
  emitirEntrada(input: { id: string; eventoId: string; usuarioId: string; codigoQr: string; asiento: string; precio: number; paymentIntentId: string }): Promise<EntradaRow>;
  getEntradaPorPago(paymentIntentId: string): Promise<EntradaRow | null>;
  getEntradaPorQr(codigoQr: string): Promise<EntradaRow | null>;
  /** Pasa de VALIDO a USADO solo si seguía VALIDO. Devuelve null si otro escáner se adelantó. */
  marcarUsada(entradaId: string, escaneadoPor: string): Promise<EntradaRow | null>;
  registrarAcceso(input: { entrada: EntradaRow; escaneadoPor: string; dispositivo: unknown; nonce: string }): Promise<void>;
  puedeEscanear(usuario: Usuario, eventoId: string): Promise<boolean>;
}

const SUPABASE_STOCK_ERROR = 'sin_entradas';

export const supabaseTicketsRepository: TicketsRepository = {
  async getEvento(id) {
    const { data } = await supabase.from('eventos').select('id, titulo, precio, entradas_disponibles, fecha_evento, artista_id').eq('id', id).single();
    return (data as EventoRow | null) ?? null;
  },

  async emitirEntrada(input) {
    // Función SQL atómica e idempotente (ver supabase/migrations/20261018000000_ticketing_integrity.sql).
    const { data, error } = await supabase.rpc('emitir_entrada', {
      p_id: input.id,
      p_evento_id: input.eventoId,
      p_usuario_id: input.usuarioId,
      p_codigo_qr: input.codigoQr,
      p_asiento: input.asiento,
      p_precio: input.precio,
      p_payment_intent_id: input.paymentIntentId,
    });
    if (error) {
      if (error.message.includes(SUPABASE_STOCK_ERROR)) throw conflict('No hay entradas disponibles');
      if (error.message.includes('evento_no_encontrado')) throw notFound('Evento no encontrado');
      throw new AppError(500, 'No se pudo emitir la entrada', error.message);
    }
    return data as EntradaRow;
  },

  async getEntradaPorPago(paymentIntentId) {
    const { data } = await supabase.from('entradas').select('*').eq('payment_intent_id', paymentIntentId).maybeSingle();
    return (data as EntradaRow | null) ?? null;
  },

  async getEntradaPorQr(codigoQr) {
    const { data } = await supabase.from('entradas').select('*').eq('codigo_qr', codigoQr).maybeSingle();
    return (data as EntradaRow | null) ?? null;
  },

  async marcarUsada(entradaId, escaneadoPor) {
    const { data } = await supabase
      .from('entradas')
      .update({ estado: 'USADO', fecha_escaneo: new Date().toISOString(), escaneado_por: escaneadoPor })
      .eq('id', entradaId)
      .eq('estado', 'VALIDO')
      .select()
      .maybeSingle();
    return (data as EntradaRow | null) ?? null;
  },

  async registrarAcceso({ entrada, escaneadoPor, dispositivo, nonce }) {
    await supabase.from('accesos').insert([
      { entrada_id: entrada.id, evento_id: entrada.evento_id, usuario_id: entrada.usuario_id, tipo_acceso: 'entrada', metodo_verificacion: 'qr', dispositivo_info: dispositivo ?? {} },
    ]);
    // Auditoría de nonces: un conflicto aquí no es un error (la entrada ya quedó marcada como usada).
    await supabase.from('qr_nonces').insert([{ nonce, ticket_id: entrada.id, evento_id: entrada.evento_id }]);
    void escaneadoPor;
  },

  async puedeEscanear(usuario, eventoId) {
    if (usuario.rol === 'super_admin') return true;
    const { data: evento } = await supabase.from('eventos').select('artista_id').eq('id', eventoId).maybeSingle();
    if (evento?.artista_id === usuario.id) return true;
    const { data: staff } = await supabase.from('staff_evento').select('id').eq('evento_id', eventoId).eq('usuario_id', usuario.id).eq('autorizado', true).maybeSingle();
    return Boolean(staff);
  },
};
