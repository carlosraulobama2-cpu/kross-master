/** Archivo de calendario (RFC 5545) para un evento. */
export function generarIcs(e: { id: string; titulo: string; descripcion: string; inicia_en: string; termina_en: string | null; recinto: string; direccion: string | null; ciudad: string }): string {
  const fecha = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
  const fin = e.termina_en ?? new Date(new Date(e.inicia_en).getTime() + 3 * 3600_000).toISOString();
  // Las líneas no deben superar 75 octetos: se pliegan con un espacio.
  const plegar = (l: string) => l.match(/.{1,73}/g)!.join('\r\n ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kroos Master//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@kroosmaster.app`,
    `DTSTAMP:${fecha(new Date().toISOString())}`,
    `DTSTART:${fecha(e.inicia_en)}`,
    `DTEND:${fecha(fin)}`,
    plegar(`SUMMARY:${escapar(e.titulo)}`),
    plegar(`LOCATION:${escapar([e.recinto, e.direccion, e.ciudad].filter(Boolean).join(', '))}`),
    plegar(`DESCRIPTION:${escapar(`${e.descripcion.slice(0, 300)}\n\nTus entradas están en la app de Kroos Master.`)}`),
    `URL:https://kroosmaster.app/evento/${e.id}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
