const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function precio(centimos: number): string {
  if (centimos === 0) return 'Gratis';
  // 15,00 € → 15 € ; 15,50 € se mantiene.
  return euros.format(centimos / 100).replace(/,00(?=\s?€)/, '');
}

export const precioExacto = (centimos: number) => euros.format(centimos / 100);

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const diaCorto = (iso: string) => {
  const d = new Date(iso);
  return {
    dia: d.getDate().toString(),
    mes: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase(),
  };
};

export const fechaLarga = (iso: string) =>
  capitalizar(new Date(iso).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));

export const fechaMedia = (iso: string) =>
  capitalizar(new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));

export const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export function cuandoEs(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const dias = Math.round((new Date(d.toDateString()).getTime() - new Date(hoy.toDateString()).getTime()) / 86_400_000);
  if (dias === 0) return `Hoy · ${hora(iso)}`;
  if (dias === 1) return `Mañana · ${hora(iso)}`;
  if (dias > 1 && dias < 7) return `${capitalizar(d.toLocaleDateString('es-ES', { weekday: 'long' }))} · ${hora(iso)}`;
  return `${fechaMedia(iso)} · ${hora(iso)}`;
}

export function cuentaAtras(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const dias = Math.floor(ms / 86_400_000);
  const horas = Math.floor((ms % 86_400_000) / 3_600_000);
  if (dias > 0) return `Faltan ${dias} día${dias === 1 ? '' : 's'}`;
  if (horas > 0) return `Faltan ${horas} h`;
  return 'Empieza muy pronto';
}

export function haceCuanto(iso: string): string {
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  return `hace ${Math.floor(seg / 86400)} d`;
}

export const mmss = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${Math.max(0, segundos % 60).toString().padStart(2, '0')}`;

export const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString('es-ES')} ${n === 1 ? uno : varios}`;
