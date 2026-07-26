import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../config/supabase';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

function PaymentContent({ evento, seat, onPagoExitoso, navigation }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [cargando, setCargando] = useState(false);

  const iniciarPago = async () => {
    try {
      setCargando(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        Alert.alert('Error', 'Debes iniciar sesión para comprar');
        navigation.navigate('Login');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-payment-intent`,
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

      Alert.alert('¡Éxito!', 'Pago completado. Tu entrada QR ha sido generada.');
      onPagoExitoso?.();
    } catch (e) {
      Alert.alert('Error', e.message);
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

export default function PaymentScreen({ route, navigation }) {
  const { evento, seat, onPagoExitoso } = route.params || {};

  React.useEffect(() => {
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
          <PaymentContent
            evento={evento}
            seat={seat}
            onPagoExitoso={onPagoExitoso}
            navigation={navigation}
          />
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
