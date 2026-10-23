import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import type { ReactNode } from 'react';

const CLAVE = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function PasarelaProvider({ children }: { children: ReactNode }) {
  return (
    <StripeProvider publishableKey={CLAVE} merchantIdentifier="merchant.com.kroosmaster.app" urlScheme="kroosmaster">
      <>{children}</>
    </StripeProvider>
  );
}

export type ResultadoPago = { estado: 'pagado' } | { estado: 'cancelado' } | { estado: 'error'; mensaje: string };

/** Abre la hoja de pago nativa de Stripe (tarjeta, Apple Pay, Google Pay). */
export function usePasarela() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  return async (clientSecret: string, nombre?: string): Promise<ResultadoPago> => {
    const init = await initPaymentSheet({
      merchantDisplayName: 'Kroos Master',
      paymentIntentClientSecret: clientSecret,
      defaultBillingDetails: nombre ? { name: nombre } : undefined,
      applePay: { merchantCountryCode: 'ES' },
      googlePay: { merchantCountryCode: 'ES', testEnv: CLAVE.startsWith('pk_test') },
      returnURL: 'kroosmaster://stripe-redirect',
      appearance: {
        colors: { primary: '#00FF87', background: '#15151D', componentBackground: '#1E1E29', primaryText: '#F5F5F8', secondaryText: '#A3A3B5', componentText: '#F5F5F8', placeholderText: '#6B6B80', componentBorder: '#2A2A37', icon: '#A3A3B5' },
        shapes: { borderRadius: 12 },
        primaryButton: { colors: { background: '#00FF87', text: '#03140A' }, shapes: { borderRadius: 16 } },
      },
    });
    if (init.error) return { estado: 'error', mensaje: init.error.message };
    const pago = await presentPaymentSheet();
    if (pago.error) return pago.error.code === 'Canceled' ? { estado: 'cancelado' } : { estado: 'error', mensaje: pago.error.message };
    return { estado: 'pagado' };
  };
}
