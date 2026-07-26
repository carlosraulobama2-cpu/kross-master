import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../config/supabase';

interface PaymentContentProps {
  evento: any;
  seat: string;
  navigation: any;
}

function PaymentContent({ evento, seat, navigation }: PaymentContentProps) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [cargando, setCargando] = useState<boolean>(false);

  const iniciarPago = async (): Promise<void> => {
    try {
      setCargando(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'Debes iniciar sesión para comprar');
        navigation.navigate('Login');
        return;
      }

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(
        `${backendUrl}/api/stripe/crear-intento-pago`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            monto: Number(evento.precio),
            eventoId: evento.id,
            usuarioId: session.user.id,
          }),
        }
      );

      const { clientSecret, error } = await response.json();
      if (error) throw new Error(error);

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Kroos Master',
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: { name: 'Cliente Kroos Master' },
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert('Pago cancelado', paymentError.message);
        return;
      }

      const confirmResponse = await fetch(`${backendUrl}/api/stripe/confirmar-pago`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paymentIntentId: clientSecret.split('_secret_')[0],
          eventoId: evento.id,
          asiento: seat,
        }),
      });

      const confirmData = await confirmResponse.json();
      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Error al confirmar pago');
      }

      Alert.alert('¡Éxito!', 'Pago completado. Tu entrada QR ha sido generada.');
      navigation.replace('TicketDetail', { entrada: confirmData.entrada });
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.paymentContainer}>
      {cargando && <ActivityIndicator size="large" color="#00FF87" style={styles.loader} />}
      <TouchableOpacity
        style={[styles.payButton, cargando && styles.payButtonDisabled]}
        onPress={iniciarPago}
        disabled={cargando}
      >
        <Text style={styles.payButtonText}>
          {cargando ? 'Procesando pago...' : `Pagar ${evento.precio},00 €`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PaymentScreen({ route, navigation }: any) {
  const { evento, seat } = route.params || {};
  const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  useEffect(() => {
    if (!evento) {
      navigation.goBack();
    }
  }, [evento]);

  if (!evento) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{evento.titulo}</Text>
        <Text style={styles.eventDetail}>Asiento: {seat}</Text>
        <Text style={styles.eventPrice}>Total: {evento.precio} €</Text>
      </View>

      <View style={styles.stripeWrapper}>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <PaymentContent evento={evento} seat={seat} navigation={navigation} />
        </StripeProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  eventInfo: {
    padding: 20,
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  eventDetail: {
    color: '#A1A1A1',
    fontSize: 14,
    marginBottom: 6,
  },
  eventPrice: {
    color: '#00FF87',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  stripeWrapper: {
    flex: 1,
  },
  paymentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loader: {
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
});
