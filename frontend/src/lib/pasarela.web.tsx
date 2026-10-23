import type { ReactNode } from 'react';

// Stripe React Native no funciona en navegador: la versión web es solo para
// previsualizar la interfaz. Los pagos se hacen desde la app de iOS/Android.
export const PasarelaProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

export type ResultadoPago = { estado: 'pagado' } | { estado: 'cancelado' } | { estado: 'error'; mensaje: string };

export function usePasarela() {
  return async (_clientSecret: string, _nombre?: string): Promise<ResultadoPago> => ({
    estado: 'error',
    mensaje: 'El pago está disponible en la app para iOS y Android',
  });
}
