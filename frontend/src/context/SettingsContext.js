import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@kroos_settings';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
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

  async function actualizarSetting(key, value) {
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
  return useContext(SettingsContext);
}
