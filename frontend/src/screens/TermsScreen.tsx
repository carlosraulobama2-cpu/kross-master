import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface TermsScreenProps {
  navigation: any;
}

export default function TermsScreen({ navigation }: TermsScreenProps) {
  const { verificarTerminos, aceptarTerminos } = useEntradas();
  const [version, setVersion] = useState('1.0');
  const [aceptado, setAceptado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    verificarAceptacion();
  }, []);

  async function verificarAceptacion() {
    try {
      const result = await verificarTerminos(version);
      setAceptado(result.aceptado);
    } catch (e) {
      console.error('Error verificando términos:', e);
    } finally {
      setCargando(false);
    }
  }

  const handleAceptar = async (): Promise<void> => {
    try {
      setCargando(true);
      await aceptarTerminos(version);
      setAceptado(true);
      Alert.alert('Éxito', 'Términos aceptados correctamente');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo aceptar');
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.version}>Versión {version}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Aceptación de los términos</Text>
          <Text style={styles.sectionText}>
            Al acceder y utilizar Kroos Master, aceptas cumplir con estos términos y condiciones.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Descripción del servicio</Text>
          <Text style={styles.sectionText}>
            Kroos Master es una plataforma de ticketing que permite comprar entradas para eventos y acceder a ellos mediante códigos QR.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Política de devoluciones</Text>
          <Text style={styles.sectionText}>
            Si el evento se cancela, se reembolsa el importe en 5-10 días hábiles. No se admiten devoluciones por cambios de opinión.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Privacidad y RGPD</Text>
          <Text style={styles.sectionText}>
            Tratamos tus datos personales de acuerdo con la normativa de protección de datos. Consulta nuestra Política de Privacidad.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Gastos de gestión</Text>
          <Text style={styles.sectionText}>
            Se aplica un gasto de gestión de 1,20 € por entrada para cubrir costes de plataforma y procesamiento.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, aceptado && styles.acceptButtonDisabled]}
          onPress={handleAceptar}
          disabled={aceptado || cargando}
        >
          <Text style={styles.acceptButtonText}>
            {aceptado ? 'Aceptado' : 'Aceptar términos'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  loading: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 40,
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
  content: {
    padding: 20,
  },
  version: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionText: {
    color: '#A1A1A1',
    fontSize: 14,
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
});
