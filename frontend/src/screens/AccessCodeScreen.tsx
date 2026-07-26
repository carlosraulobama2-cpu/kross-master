import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface AccessCodeScreenProps {
  navigation: any;
}

export default function AccessCodeScreen({ navigation }: AccessCodeScreenProps) {
  const { validarCodigoAcceso } = useEntradas();
  const [codigo, setCodigo] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleValidar = async (): Promise<void> => {
    if (!codigo.trim() || !eventoId.trim()) {
      Alert.alert('Error', 'Ingresa el código y el ID del evento');
      return;
    }

    try {
      setCargando(true);
      const result = await validarCodigoAcceso(codigo.trim(), eventoId.trim());
      Alert.alert('Éxito', 'Código válido. Puedes escanear entradas.', [
        { text: 'Continuar', onPress: () => navigation.replace('StaffScan', { eventoId, codigoAcceso: codigo }) },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Código inválido');
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Código de Acceso</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Validar acceso al evento</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de acceso proporcionado por el organizador y el ID del evento.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Código de acceso"
          placeholderTextColor="#8E8E93"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
        />

        <TextInput
          style={styles.input}
          placeholder="ID del evento"
          placeholderTextColor="#8E8E93"
          value={eventoId}
          onChangeText={setEventoId}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, cargando && styles.buttonDisabled]}
          onPress={handleValidar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator size="small" color="#0D0D12" />
          ) : (
            <Text style={styles.buttonText}>Validar y continuar</Text>
          )}
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
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A1A1A1',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1C1C24',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
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
});
