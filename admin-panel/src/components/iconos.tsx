import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { tam?: number };

function Base({ tam = 18, children, ...props }: Props) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const IconoResumen = (p: Props) => (<Base {...p}><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /></Base>);
export const IconoEventos = (p: Props) => (<Base {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Base>);
export const IconoPedidos = (p: Props) => (<Base {...p}><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2M13 17v2M13 11v2" /></Base>);
export const IconoUsuarios = (p: Props) => (<Base {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Base>);
export const IconoAuditoria = (p: Props) => (<Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></Base>);
export const IconoAjustes = (p: Props) => (<Base {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></Base>);
export const IconoBuscar = (p: Props) => (<Base {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Base>);
export const IconoSalir = (p: Props) => (<Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Base>);
export const IconoMenu = (p: Props) => (<Base {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Base>);
export const IconoEstrella = ({ relleno, ...p }: Props & { relleno?: boolean }) => (<Base {...p} fill={relleno ? 'currentColor' : 'none'}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Base>);
export const IconoOk = (p: Props) => (<Base {...p}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></Base>);
export const IconoAlerta = (p: Props) => (<Base {...p}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></Base>);
export const IconoDinero = (p: Props) => (<Base {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></Base>);
export const IconoEntrada = IconoPedidos;
export const IconoReembolso = (p: Props) => (<Base {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></Base>);
export const IconoMas = (p: Props) => (<Base {...p}><path d="M5 12h14M12 5v14" /></Base>);
export const IconoFlechaIzq = (p: Props) => (<Base {...p}><path d="m15 18-6-6 6-6" /></Base>);
export const IconoFlechaDer = (p: Props) => (<Base {...p}><path d="m9 18 6-6-6-6" /></Base>);
export const IconoCandado = (p: Props) => (<Base {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Base>);
export const IconoX = (p: Props) => (<Base {...p}><path d="M18 6 6 18M6 6l12 12" /></Base>);
export const IconoAyuda = (p: Props) => (<Base {...p}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></Base>);
export const IconoSoporte = (p: Props) => (<Base {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Base>);
