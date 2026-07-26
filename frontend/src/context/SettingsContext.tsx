import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@kroos_settings';

interface Settings {
  darkMode: boolean;
  textoGrande: boolean;
  notificaciones: boolean;
  idioma: string;
  moneda: string;
  biometrico: boolean;
}

interface SettingsContextType {
  settings: Settings;
  cargando: boolean;
  actualizarSetting: (key: keyof Settings, value: boolean | string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    darkMode: true,
    textoGrande: false,
    notificaciones: true,
    idioma: 'es',
    moneda: 'EUR',
    biometrico: false,
  });
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarSettings();
  }, []);

  async function cargarSettings() {
    try {
      const datos = await AsyncStorage.getItem(SETTINGS_KEY);
      if (datos) {
        setSettings(JSON.parse(datos));
      }
    } catch (e) {
      console.error('Error cargando settings:', e);
    } finally {
      setCargando(false);
    }
  }

  async function actualizarSetting(key: keyof Settings, value: boolean | string) {
    try {
      const nuevos = { ...settings, [key]: value };
      setSettings(nuevos);
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(nuevos));
    } catch (e) {
      console.error('Error guardando setting:', e);
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, cargando, actualizarSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider');
  }
  return context;
}
