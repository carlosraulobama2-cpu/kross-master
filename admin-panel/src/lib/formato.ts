const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eurosCompacto = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
const numero = new Intl.NumberFormat('es-ES');

export const dinero = (centimos: number) => euros.format(centimos / 100);
export const dineroCompacto = (centimos: number) => (centimos >= 1_000_000 ? eurosCompacto.format(centimos / 100) : dinero(centimos));
export const entero = (n: number) => numero.format(n);

export const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function haceCuanto(iso: string): string {
  const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return 'ahora';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 7 * 86400) return `hace ${Math.floor(seg / 86400)} d`;
  return fecha(iso);
}

export const ETIQUETA_ROL = { fan: 'Fan', organizador: 'Organizador', admin: 'Admin' } as const;
export const ETIQUETA_EVENTO = { borrador: 'Borrador', publicado: 'Publicado', cancelado: 'Cancelado', finalizado: 'Finalizado' } as const;
export const ETIQUETA_PEDIDO = { pendiente: 'Pendiente', pagado: 'Pagado', expirado: 'Expirado', cancelado: 'Cancelado', reembolsado: 'Reembolsado' } as const;
