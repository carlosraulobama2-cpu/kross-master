import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoProvider } from './src/components/aviso';
import { Icono, T } from './src/components/base';
import { ErrorApi } from './src/lib/api';
import { AuthProvider, useAuth } from './src/lib/auth';
import { useConfig } from './src/lib/consultas';
import { PasarelaProvider } from './src/lib/pasarela';
import { registrarPush } from './src/lib/push';
import { Navegacion } from './src/navigation';
import { Bienvenida } from './src/screens/Bienvenida';
import { color, espacio } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // No reintenta errores del cliente (404, 403…), solo fallos de red/servidor.
      retry: (fallos, error) => !(error instanceof ErrorApi && error.status >= 400 && error.status < 500) && fallos < 2,
    },
  },
});

// Refresca datos al volver a la app.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => focusManager.setFocused(estado === 'active'));
}
onlineManager.setOnline(true);

const CLAVE_BIENVENIDA = 'km.bienvenida';

function AvisoMantenimiento() {
  const { data } = useConfig();
  const insets = useSafeAreaInsets();
  if (!data?.mantenimiento) return null;
  return (
    <View style={[s.mantenimiento, { paddingTop: insets.top + espacio.s }]}>
      <Icono n="construct" tam={16} c={color.fondo} />
      <T v="nota" style={{ color: color.fondo, fontWeight: '700', flex: 1 }}>
        {data.mensaje_mantenimiento || 'Estamos haciendo mejoras. Algunas funciones pueden no estar disponibles.'}
      </T>
    </View>
  );
}

function Raiz() {
  const { listo, usuario } = useAuth();
  const [bienvenida, setBienvenida] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_BIENVENIDA)
      .then((v) => setBienvenida(v !== 'vista'))
      .catch(() => setBienvenida(false));
  }, []);

  useEffect(() => {
    if (usuario) void registrarPush();
  }, [usuario]);

  if (!listo || bienvenida === null) {
    return (
      <View style={s.carga}>
        <View style={s.logo}>
          <T v="display" c="acentoTexto">
            K
          </T>
        </View>
        <ActivityIndicator color={color.acento} style={{ marginTop: espacio.xxl }} />
      </View>
    );
  }

  if (bienvenida) {
    return (
      <Bienvenida
        onTerminar={() => {
          setBienvenida(false);
          void AsyncStorage.setItem(CLAVE_BIENVENIDA, 'vista').catch(() => undefined);
        }}
      />
    );
  }

  return (
    <>
      <Navegacion />
      <AvisoMantenimiento />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: color.fondo }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PasarelaProvider>
            <AvisoProvider>
              <StatusBar style="light" />
              <Raiz />
            </AvisoProvider>
          </PasarelaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  carga: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.fondo },
  logo: { width: 88, height: 88, borderRadius: 28, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  mantenimiento: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: espacio.s, paddingHorizontal: espacio.l, paddingBottom: espacio.s, backgroundColor: color.aviso },
});
