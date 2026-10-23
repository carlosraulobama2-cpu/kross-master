export type Rol = 'fan' | 'organizador' | 'admin';
export type EstadoEvento = 'borrador' | 'publicado' | 'cancelado' | 'finalizado';
export type EstadoPedido = 'pendiente' | 'pagado' | 'expirado' | 'cancelado' | 'reembolsado';

export interface Sesion {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
}

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}

export interface Resumen {
  usuarios: number;
  organizadores: number;
  eventos_publicados: number;
  entradas_vendidas: number;
  gmv_centimos: number;
  ingresos_centimos: number;
  reembolsado_centimos: number;
  pedidos_hoy: number;
  serie: { dia: string; pedidos: number; gmv_centimos: number }[];
  top_eventos: { id: string; titulo: string; vendidas: number }[];
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  nombre_artistico: string | null;
  ciudad: string | null;
  bloqueado: boolean;
  stripe_onboarding_completo: boolean;
  creado_en: string;
}

export interface EventoAdmin {
  id: string;
  titulo: string;
  categoria: string;
  ciudad: string;
  recinto: string;
  inicia_en: string;
  estado: EstadoEvento;
  destacado: boolean;
  creado_en: string;
  organizador: { id: string; nombre: string; nombre_artistico: string | null; email: string } | null;
  aforo: number;
  vendidas: number;
}

export interface PedidoAdmin {
  id: string;
  estado: EstadoPedido;
  subtotal_centimos: number;
  gastos_centimos: number;
  total_centimos: number;
  moneda: string;
  creado_en: string;
  pagado_en: string | null;
  stripe_payment_intent_id: string | null;
  usuario: { id: string; nombre: string; email: string } | null;
  evento: { id: string; titulo: string } | null;
  items: { cantidad: number }[];
}

export interface RegistroAuditoria {
  id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  datos: Record<string, unknown>;
  creado_en: string;
  actor: { nombre: string; email: string } | null;
}

export interface Configuracion {
  gastos_gestion_porcentaje: number;
  gastos_gestion_fijo_centimos: number;
  comision_plataforma_porcentaje: number;
  minutos_reserva: number;
  moneda: string;
  registro_abierto: boolean;
  mantenimiento: boolean;
  mensaje_mantenimiento: string | null;
  email_soporte: string | null;
  actualizado_en: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
}
