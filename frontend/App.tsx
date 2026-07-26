import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { EntradasProvider, useEntradas } from './src/context/EntradasContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { UiProvider } from './src/context/UiContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

function Root() {
  const { cargando, onboardingCompletado } = useEntradas();
  const [vista, setVista] = useState<'splash' | 'onboarding' | 'home'>('splash');

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (!mounted) return;
      if (!cargando) {
        setVista(onboardingCompletado ? 'home' : 'onboarding');
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [cargando, onboardingCompletado]);

  if (cargando || vista === 'splash') {
    return <SplashScreen />;
  }

  if (vista === 'onboarding') {
    return <OnboardingScreen />;
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <EntradasProvider>
      <SettingsProvider>
        <UiProvider>
          <Root />
        </UiProvider>
      </SettingsProvider>
    </EntradasProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: '#0D0D12',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
