import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import * as Haptics from 'expo-haptics';

interface ScanQRScreenProps {
  navigation: any;
}

export default function ScanQRScreen({ navigation, route }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState<boolean>(true);
  const [resultado, setResultado] = useState<any>(null);
  const [mostrarAnimacion, setMostrarAnimacion] = useState(false);
  const eventoId = route?.params?.eventoId;
  const codigoAcceso = route?.params?.codigoAcceso;
  const usuarioId = route?.params?.usuarioId;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const reproducirAnimacionExito = (): void => {
    setMostrarAnimacion(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

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
      reproducirAnimacionExito();
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
                    setMostrarAnimacion(false);
                    scaleAnim.setValue(0);
                    opacityAnim.setValue(0);
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

      {mostrarAnimacion && (
        <Animated.View style={[styles.successOverlay, { opacity: opacityAnim }]}>
          <Animated.View style={[styles.flashBackground, { opacity: flashAnim }]} />
          <Animated.View style={[styles.successContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#00FF87" />
            </View>
            <Text style={styles.successText}>VÁLIDO</Text>
            <Text style={styles.successSubtext}>Acceso permitido</Text>
          </Animated.View>
        </Animated.View>
      )}
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
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  flashBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#00FF87',
  },
  successContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#00FF87',
    letterSpacing: 2,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: '#A1A1A1',
    fontWeight: '600',
  },
});