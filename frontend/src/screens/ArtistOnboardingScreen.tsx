import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface ArtistOnboardingScreenProps {
  navigation: any;
}

export default function ArtistOnboardingScreen({ navigation }: ArtistOnboardingScreenProps) {
  const { usuario, actualizarPerfil, conectarStripeConnect, obtenerStripeConnectStatus, aceptarTerminos } = useEntradas();
  const [paso, setPaso] = useState(1);
  const [razonSocial, setRazonSocial] = useState('');
  const [dniCif, setDniCif] = useState('');
  const [cargando, setCargando] = useState(false);
  const [stripeConectado, setStripeConectado] = useState(false);

  useEffect(() => {
    verificarStripe();
  }, []);

  async function verificarStripe() {
    try {
      const status = await obtenerStripeConnectStatus();
      setStripeConectado(status.conectado);
    } catch (e) {
      console.error('Error verificando Stripe:', e);
    }
  }

  const handleGuardarDatos = async (): Promise<void> => {
    try {
      setCargando(true);
      await actualizarPerfil({
        razon_social: razonSocial,
        dni_cif: dniCif,
        rol: 'artista',
      });
      setPaso(2);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar');
    } finally {
      setCargando(false);
    }
  };

  const handleConectarStripe = async (): Promise<void> => {
    try {
      setCargando(true);
      const result = await conectarStripeConnect();
      Alert.alert(
        'Stripe Connect',
        'Se abrirá el flujo de Stripe para conectar tu cuenta bancaria.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => console.log('Abrir URL:', result.url) },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo conectar Stripe');
    } finally {
      setCargando(false);
    }
  };

  const handleFinalizar = async (): Promise<void> => {
    try {
      await aceptarTerminos('1.0', 'terminos');
      navigation.replace('Home');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Onboarding Artista</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.stepContainer}>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, paso >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, paso >= 2 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, paso >= 3 && styles.stepDotActive]} />
        </View>

        {paso === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Datos fiscales</Text>
            <Text style={styles.stepDescription}>
              Necesitamos tu razón social y DNI/CIF para emitir facturas legales.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Razón social / Nombre completo"
              placeholderTextColor="#8E8E93"
              value={razonSocial}
              onChangeText={setRazonSocial}
            />
            <TextInput
              style={styles.input}
              placeholder="DNI / CIF"
              placeholderTextColor="#8E8E93"
              value={dniCif}
              onChangeText={setDniCif}
            />
            <TouchableOpacity
              style={[styles.button, cargando && styles.buttonDisabled]}
              onPress={handleGuardarDatos}
              disabled={cargando}
            >
              <Text style={styles.buttonText}>
                {cargando ? 'Guardando...' : 'Continuar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {paso === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Conexión bancaria</Text>
            <Text style={styles.stepDescription}>
              Conecta tu cuenta bancaria con Stripe Connect para recibir pagos directamente.
            </Text>
            <View style={styles.stripeStatus}>
              <Ionicons
                name={stripeConectado ? 'checkmark-circle' : 'time-outline'}
                size={24}
                color={stripeConectado ? '#00FF87' : '#8E8E93'}
              />
              <Text style={styles.stripeStatusText}>
                {stripeConectado ? 'Cuenta conectada' : 'Pendiente de conectar'}
              </Text>
            </View>
            {!stripeConectado && (
              <TouchableOpacity
                style={[styles.button, cargando && styles.buttonDisabled]}
                onPress={handleConectarStripe}
                disabled={cargando}
              >
                <Text style={styles.buttonText}>
                  {cargando ? 'Conectando...' : 'Conectar con Stripe'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setPaso(3)}
            >
              <Text style={styles.secondaryButtonText}>Siguiente</Text>
            </TouchableOpacity>
          </View>
        )}

        {paso === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Términos y condiciones</Text>
            <Text style={styles.stepDescription}>
              Acepta los términos de servicio y la política de privacidad para completar el registro.
            </Text>
            <TouchableOpacity style={styles.button} onPress={handleFinalizar}>
              <Text style={styles.buttonText}>Aceptar y finalizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepContainer: {
    padding: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2C2C36',
  },
  stepDotActive: {
    backgroundColor: '#00FF87',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#2C2C36',
    marginHorizontal: 8,
  },
  stepContent: {
    backgroundColor: '#1C1C24',
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#A1A1A1',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#111118',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#2C2C36',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  stripeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stripeStatusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
