import { locale, traducir as t } from './i18n';

const euros = () => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' });

export function precio(centimos: number): string {
  if (centimos === 0) return t('Gratis');
  // 15,00 € → 15 € (y €15.00 → €15); 15,50 € se mantiene.
  return euros().format(centimos / 100).replace(/[.,]00(?!\d)/, '');
}

export const precioExacto = (centimos: number) => euros().format(centimos / 100);

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const diaCorto = (iso: string) => {
  const d = new Date(iso);
  return {
    dia: d.getDate().toString(),
    mes: d.toLocaleDateString(locale(), { month: 'short' }).replace('.', '').toUpperCase(),
  };
};

export const fechaLarga = (iso: string) =>
  capitalizar(new Date(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' }));

/** Fecha larga para usar dentro de una frase (sin mayúscula inicial en español y catalán). */
export const fechaFrase = (iso: string) => new Date(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });

export const fechaMedia = (iso: string) =>
  capitalizar(new Date(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''));

export const hora = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });

export function cuandoEs(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const dias = Math.round((new Date(d.toDateString()).getTime() - new Date(hoy.toDateString()).getTime()) / 86_400_000);
  if (dias === 0) return `${t('Hoy')} · ${hora(iso)}`;
  if (dias === 1) return `${t('Mañana')} · ${hora(iso)}`;
  if (dias > 1 && dias < 7) return `${capitalizar(d.toLocaleDateString(locale(), { weekday: 'long' }))} · ${hora(iso)}`;
  return `${fechaMedia(iso)} · ${hora(iso)}`;
}

export function cuentaAtras(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const dias = Math.floor(ms / 86_400_000);
  const horas = Math.floor((ms % 86_400_000) / 3_600_000);
  if (dias > 0) return t(dias === 1 ? 'Falta 1 día' : 'Faltan {n} días', { n: dias });
  if (horas > 0) return t('Faltan {n} h', { n: horas });
  return t('Empieza muy pronto');
}

export function haceCuanto(iso: string): string {
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return t('ahora');
  if (seg < 3600) return t('hace {n} min', { n: Math.floor(seg / 60) });
  if (seg < 86400) return t('hace {n} h', { n: Math.floor(seg / 3600) });
  return t('hace {n} d', { n: Math.floor(seg / 86400) });
}

export const mmss = (segundos: number) =>
  `${Math.floor(segundos / 60)}:${Math.max(0, segundos % 60).toString().padStart(2, '0')}`;

export const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString(locale())} ${t(n === 1 ? uno : varios)}`;
