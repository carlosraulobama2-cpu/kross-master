/** Error de dominio con código estable que la app puede traducir. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}

export const noEncontrado = (que = 'Recurso') => new AppError(404, 'NO_ENCONTRADO', `${que} no encontrado`);
export const prohibido = (mensaje = 'No tienes permiso para esta acción') => new AppError(403, 'PROHIBIDO', mensaje);
export const conflicto = (codigo: string, mensaje: string) => new AppError(409, codigo, mensaje);
export const peticionInvalida = (codigo: string, mensaje: string) => new AppError(400, codigo, mensaje);

/** Errores lanzados con `raise exception` desde las funciones SQL. */
const ERRORES_SQL: Record<string, AppError> = {
  EVENTO_NO_DISPONIBLE: conflicto('EVENTO_NO_DISPONIBLE', 'El evento ya no está a la venta'),
  TRAMO_INVALIDO: peticionInvalida('TRAMO_INVALIDO', 'Algún tipo de entrada no es válido'),
  LIMITE_POR_PEDIDO: peticionInvalida('LIMITE_POR_PEDIDO', 'Superas el máximo de entradas por pedido'),
  SIN_STOCK: conflicto('SIN_STOCK', 'No quedan entradas suficientes'),
  TRANSFERENCIA_NO_DISPONIBLE: conflicto('TRANSFERENCIA_NO_DISPONIBLE', 'La transferencia ya no está disponible'),
  ENTRADA_NO_TRANSFERIBLE: conflicto('ENTRADA_NO_TRANSFERIBLE', 'Esta entrada ya no se puede transferir'),
  PEDIDO_NO_REEMBOLSABLE: conflicto('PEDIDO_NO_REEMBOLSABLE', 'Este pedido no se puede reembolsar'),
  CODIGO_INVALIDO: peticionInvalida('CODIGO_INVALIDO', 'El código de descuento no es válido o ya se ha agotado'),
  PREVENTA_CODIGO: peticionInvalida('PREVENTA_CODIGO', 'Necesitas el código de preventa para estas entradas'),
  COLA_TURNO: conflicto('COLA_TURNO', 'Hay mucha demanda: entra en la cola virtual para comprar'),
  REVENTA_NO_PERMITIDA: conflicto('REVENTA_NO_PERMITIDA', 'Esta entrada no se puede poner en reventa'),
  REVENTA_NO_CANCELABLE: conflicto('REVENTA_NO_CANCELABLE', 'Esta entrada ya no está en reventa'),
  ASIENTO_OCUPADO: conflicto('ASIENTO_OCUPADO', 'Alguna de las butacas elegidas ya no está libre. Elige otras'),
  FASE_NO_ABIERTA: conflicto('FASE_NO_ABIERTA', 'Este tipo de entrada abrirá cuando se agote el anterior'),
  EXTRA_NO_DISPONIBLE: conflicto('EXTRA_NO_DISPONIBLE', 'Algún extra ya no está disponible'),
  CUPO_INVITACIONES: conflicto('CUPO_INVITACIONES', 'Has alcanzado el cupo de invitaciones de este evento'),
  PLANO_CON_VENTAS: conflicto('PLANO_CON_VENTAS', 'No se puede cambiar el plano de un tipo de entrada con ventas'),
  PLANO_INVALIDO: peticionInvalida('PLANO_INVALIDO', 'El plano debe tener entre 1 y 60 filas y entre 1 y 100 butacas por fila'),
  LIMITE_POR_USUARIO: conflicto('LIMITE_POR_USUARIO', 'Has alcanzado el máximo de entradas por persona para este evento'),
};

export function errorDesdeSql(error: { message?: string } | null | undefined): Error {
  const mensaje = error?.message ?? '';
  const conocido = Object.keys(ERRORES_SQL).find((k) => mensaje.includes(k));
  return conocido ? ERRORES_SQL[conocido]! : new Error(mensaje || 'Error de base de datos');
}
