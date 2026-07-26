import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

interface ScanQRScreenProps {
  navigation: any;
}

export default function ScanQRScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState<boolean>(true);
  const [resultado, setResultado] = useState<any>(null);
  const eventoId = route?.params?.eventoId;
  const codigoAcceso = route?.params?.codigoAcceso;
  const usuarioId = route?.params?.usuarioId;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = async (event: any): Promise<void> => {
    if (!escaneando) return;
    setEscaneando(false);

    try {
      const codigoQr = event.data;
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      const response = await fetch(
        `${backendUrl}/api/qr/validar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            codigo_qr: codigoQr,
            codigo_acceso: codigoAcceso,
            usuario_id: usuarioId,
            dispositivo_info: { platform: 'mobile' },
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.mensaje || 'Error al validar QR');
      }

      setResultado(data);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
      setEscaneando(true);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00FF87" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Necesitamos acceso a la cámara para escanear QR</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionText}>Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={escaneando ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Escanear QR</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>

          <View style={styles.bottomBar}>
            {resultado ? (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>{resultado.mensaje}</Text>
                <TouchableOpacity
                  style={styles.scanAgainButton}
                  onPress={() => {
                    setResultado(null);
                    setEscaneando(true);
                  }}
                >
                  <Text style={styles.scanAgainText}>Escanear otro</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.instruction}>Apunta al código QR de la entrada</Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF87',
  },
  cornerTopRight: {
    position: 'absolute',
    top: '30%',
    right: '10%',
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF87',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: '25%',
    left: '10%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00FF87',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: '25%',
    right: '10%',
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00FF87',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultTitle: {
    color: '#00FF87',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#00FF87',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  scanAgainText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 14,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#00FF87',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'center',
  },
  permissionText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 14,
  },
});