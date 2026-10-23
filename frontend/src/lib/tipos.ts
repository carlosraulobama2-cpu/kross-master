import type { Categoria } from '../theme';

export type Rol = 'fan' | 'organizador' | 'admin';

export interface Sesion {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  avatar_url: string | null;
  telefono: string | null;
  bio: string | null;
  nombre_artistico: string | null;
  ciudad: string | null;
  stripe_onboarding_completo: boolean;
  creado_en: string;
}

export interface EventoResumen {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  recinto: string;
  direccion: string | null;
  ciudad: string;
  imagen_url: string | null;
  inicia_en: string;
  termina_en: string | null;
  edad_minima: number | null;
  politica_devolucion: string;
  destacado: boolean;
  organizador_nombre: string;
  precio_desde_centimos: number;
  /** Precio con gastos de gestión incluidos: lo que se paga de verdad. */
  precio_desde_total_centimos: number;
  disponibles: number;
  aforo: number;
  recinto_id: string | null;
  puertas_abren_en: string | null;
  max_por_usuario: number | null;
  tiene_preventa: boolean | null;
  tiene_accesibles: boolean | null;
  reventa_disponibles: number;
  cola_activa: boolean;
  registro_fan_activo: boolean;
  artistas: ArtistaMini[];
  /** Solo en búsquedas «cerca de mí». */
  distancia_km?: number | null;
  /** Solo en recomendaciones. */
  motivo?: string | null;
}

export interface EstadoCola {
  en_cola: boolean;
  admitido: boolean;
  por_delante: number | null;
  minutos_estimados: number | null;
  expira_en: string | null;
}

export interface ArtistaMini {
  id: string;
  nombre: string;
  imagen_url: string | null;
}

export interface InfoRecinto {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string;
  imagen_url: string | null;
  como_llegar: string | null;
  parking: string | null;
  accesibilidad: string | null;
  objetos_prohibidos: string | null;
}

export interface Artista extends ArtistaMini {
  bio: string | null;
  generos: string[];
  eventos: EventoResumen[];
  siguiendo: boolean;
  seguidores: number;
}

export interface Recinto extends InfoRecinto {
  aforo: number | null;
  eventos: EventoResumen[];
  siguiendo: boolean;
  seguidores: number;
}

export type EstadoTramo = 'a_la_venta' | 'agotado' | 'proximamente' | 'finalizado';

export interface Tramo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number;
  gastos_centimos: number;
  precio_total_centimos: number;
  max_por_pedido: number;
  disponibles: number;
  venta_inicia_en: string | null;
  estado: EstadoTramo;
  preventa: boolean;
  accesible: boolean;
  incluye_acompanante: boolean;
  reventa_disponibles: number;
  /** Con plano de butacas: se elige sitio. */
  numerado: boolean;
  /** Fase automática: nombre del tipo que tiene que agotarse antes. */
  abre_al_agotar: string | null;
}

export type TipoExtra = 'parking' | 'merch' | 'vip' | 'comida' | 'otro';

export interface Extra {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoExtra;
  precio_centimos: number;
  max_por_pedido: number;
  disponibles: number;
}

export interface Asiento {
  id: string;
  seccion: string;
  fila: string;
  orden_fila: number;
  numero: number;
  estado: 'libre' | 'ocupado';
}

export interface Faq {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
}

export interface ConsultaSoporte {
  id: string;
  asunto: string;
  mensaje: string;
  estado: 'abierta' | 'respondida' | 'cerrada';
  respuesta: string | null;
  creado_en: string;
  respondida_en: string | null;
}

export interface EventoDetalle extends EventoResumen {
  favorito: boolean;
  en_lista_espera: boolean;
  registro_fan: 'inscrito' | 'seleccionado' | 'no_seleccionado' | null;
  cola: EstadoCola | null;
  recinto_info: InfoRecinto | null;
  valoracion: { media: number | null; total: number };
  tramos: Tramo[];
  extras: Extra[];
  fecha_original: string | null;
  reembolso_aplazamiento_hasta: string | null;
}

export type EstadoPedido = 'pendiente' | 'pagado' | 'expirado' | 'cancelado' | 'reembolsado';

export interface Pedido {
  id: string;
  estado: EstadoPedido;
  subtotal_centimos: number;
  descuento_centimos: number;
  gastos_centimos: number;
  seguro_centimos: number;
  total_centimos: number;
  moneda: string;
  es_reventa: boolean;
  canal: 'app' | 'taquilla' | 'invitacion' | 'reventa';
  extras_centimos: number;
  asientos: { seccion: string; fila: string; numero: number }[];
  extras: { cantidad: number; precio_unitario_centimos: number; codigo: string; canjeado_en: string | null; extra: { id: string; nombre: string; tipo: TipoExtra } }[];
  recibo_url: string | null;
  reclamacion: { estado: 'pendiente' | 'aprobada' | 'rechazada'; respuesta: string | null; creado_en: string } | null;
  expira_en: string;
  pagado_en: string | null;
  creado_en: string;
  evento: {
    id: string;
    titulo: string;
    categoria: Categoria;
    inicia_en: string;
    recinto: string;
    ciudad: string;
    imagen_url: string | null;
    fecha_original: string | null;
    reembolso_aplazamiento_hasta: string | null;
  };
  items: { cantidad: number; precio_unitario_centimos: number; tramo: { id: string; nombre: string } }[];
}

export type EstadoEntrada = 'valida' | 'usada' | 'anulada' | 'reembolsada' | 'en_venta' | 'revendida';

export interface Entrada {
  id: string;
  codigo: string;
  estado: EstadoEntrada;
  usada_en: string | null;
  creado_en: string;
  qr_semilla: string | null;
  pedido_id: string;
  es_acompanante: boolean;
  reventas: { estado: string; precio_centimos: number }[];
  transferenciaPendiente?: boolean;
  evento: {
    id: string;
    titulo: string;
    categoria: Categoria;
    inicia_en: string;
    termina_en: string | null;
    recinto: string;
    direccion: string | null;
    ciudad: string;
    imagen_url: string | null;
    estado: string;
    fecha_original: string | null;
    reembolso_aplazamiento_hasta: string | null;
  };
  tramo: { id: string; nombre: string; accesible: boolean };
  asiento: { seccion: string; fila: string; numero: number } | null;
}

export interface PedidoResumen {
  id: string;
  estado: EstadoPedido;
  total_centimos: number;
  creado_en: string;
  pagado_en: string | null;
  evento: { id: string; titulo: string; categoria: Categoria; inicia_en: string; imagen_url: string | null };
  items: { cantidad: number }[];
}

export interface CodigoDescuento {
  codigo: string;
  descripcion: string | null;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  tramo_ids: string[] | null;
}

export interface CodigoPromocional extends CodigoDescuento {
  id: string;
  usos: number;
  usos_max: number | null;
  activo: boolean;
  valido_hasta: string | null;
}

export interface Transferencia {
  id: string;
  estado: string;
  creado_en: string;
  entrada: { id: string; tramo: { nombre: string }; evento: { id: string; titulo: string; inicia_en: string; imagen_url: string | null } };
  de: { nombre: string; email: string };
  a: { nombre: string; email: string };
}

export interface Notificacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  datos: Record<string, unknown>;
  leida: boolean;
  creado_en: string;
}

export interface ConfigPublica {
  gastos_gestion_porcentaje: number;
  gastos_gestion_fijo_centimos: number;
  seguro_porcentaje: number;
  minutos_reserva: number;
  moneda: string;
  registro_abierto: boolean;
  mantenimiento: boolean;
  mensaje_mantenimiento: string | null;
  email_soporte: string | null;
}

// --- Organizador ---

export type EstadoEvento = 'borrador' | 'publicado' | 'cancelado' | 'finalizado';

export interface EventoOrganizador {
  id: string;
  titulo: string;
  categoria: Categoria;
  recinto: string;
  ciudad: string;
  imagen_url: string | null;
  inicia_en: string;
  estado: EstadoEvento;
  destacado: boolean;
  aforo: number;
  vendidas: number;
  ingresos_centimos: number;
}

export interface TramoOrganizador {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number;
  cantidad_total: number;
  cantidad_vendida: number;
  cantidad_reservada: number;
  max_por_pedido: number;
  activo: boolean;
  orden: number;
  codigo_acceso: string | null;
  accesible: boolean;
  incluye_acompanante: boolean;
  numerado: boolean;
  fase_anterior_id: string | null;
}

export interface ExtraOrganizador extends Omit<Extra, 'disponibles'> {
  stock_total: number;
  stock_vendido: number;
  stock_reservado: number;
  activo: boolean;
}

export interface EstadisticasEvento {
  vendidas: number;
  validadas: number;
  aforo: number;
  ingresos_centimos: number;
  pedidos: number;
  por_canal?: Record<string, number>;
  extras_centimos?: number;
  serie: { dia: string; entradas: number; ingresos_centimos: number }[];
}

export interface EventoGestion extends Omit<EventoOrganizador, 'aforo' | 'vendidas' | 'ingresos_centimos'> {
  descripcion: string;
  direccion: string | null;
  termina_en: string | null;
  puertas_abren_en: string | null;
  max_por_usuario: number | null;
  cola_activa: boolean;
  cola_ritmo: number;
  registro_fan_activo: boolean;
  cupo_invitaciones: number;
  fecha_original: string | null;
  reembolso_aplazamiento_hasta: string | null;
  artistas: { id: string; nombre: string }[];
  recinto_info: Omit<InfoRecinto, 'direccion' | 'ciudad' | 'imagen_url'> | null;
  tramos: TramoOrganizador[];
  estadisticas: EstadisticasEvento;
}

export type ResultadoEscaneo = 'valida' | 'ya_usada' | 'invalida' | 'otro_evento' | 'anulada' | 'caducada';

export interface Escaneo {
  resultado: ResultadoEscaneo;
  valida: boolean;
  mensaje: string;
  entrada: { codigo: string; estado: string; usada_en: string | null; tramo: { nombre: string }; titular: { nombre: string } } | null;
}
