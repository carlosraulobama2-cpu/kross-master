/** Fecha legible en español. Las fechas llegan de la base de datos como texto ISO; los datos de prueba antiguos traían texto libre. */
export function formatFecha(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
