import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEntradas } from '../context/EntradasContext';
import { useSettings } from '../context/SettingsContext';

interface SettingsScreenProps {
  navigation: any;
}

const IDIOMAS = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
];

const MONEDAS = [
  { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
  { codigo: 'USD', simbolo: '$', nombre: 'Dólar' },
];

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { logout } = useEntradas();
  const { settings, actualizarSetting } = useSettings();

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigation.replace('Home');
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  const handleCambiarIdioma = (): void => {
    const idx = IDIOMAS.findIndex((i) => i.codigo === settings.idioma);
    const siguiente = IDIOMAS[(idx + 1) % IDIOMAS.length];
    actualizarSetting('idioma', siguiente.codigo);
    Alert.alert('Idioma', `Idioma cambiado a ${siguiente.nombre}`);
  };

  const handleCambiarMoneda = (): void => {
    const idx = MONEDAS.findIndex((m) => m.codigo === settings.moneda);
    const siguiente = MONEDAS[(idx + 1) % MONEDAS.length];
    actualizarSetting('moneda', siguiente.codigo);
    Alert.alert('Moneda', `Moneda cambiada a ${siguiente.nombre}`);
  };

  const handleLimpiarCache = async (): Promise<void> => {
    Alert.alert('Limpiar caché', '¿Borrar datos locales de la app?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            Alert.alert('Listo', 'Caché eliminada');
          } catch (e) {
            Alert.alert('Error', 'No se pudo borrar la caché');
          }
        },
      },
    ]);
  };

  const idiomaActual = IDIOMAS.find((i) => i.codigo === settings.idioma)?.nombre || 'Español';
  const monedaActual = MONEDAS.find((m) => m.codigo === settings.moneda)?.nombre || 'EUR';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferencias</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Modo oscuro</Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(v) => actualizarSetting('darkMode', v)}
            trackColor={{ false: '#2C2C36', true: '#00FF87' }}
            thumbColor={settings.darkMode ? '#0D0D12' : '#8E8E93'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="text-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Texto grande</Text>
          </View>
          <Switch
            value={settings.textoGrande}
            onValueChange={(v) => actualizarSetting('textoGrande', v)}
            trackColor={{ false: '#2C2C36', true: '#00FF87' }}
            thumbColor={settings.textoGrande ? '#0D0D12' : '#8E8E93'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Notificaciones</Text>
          </View>
          <Switch
            value={settings.notificaciones}
            onValueChange={(v) => actualizarSetting('notificaciones', v)}
            trackColor={{ false: '#2C2C36', true: '#00FF87' }}
            thumbColor={settings.notificaciones ? '#0D0D12' : '#8E8E93'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>

        <TouchableOpacity style={styles.settingItem} onPress={handleCambiarIdioma}>
          <View style={styles.settingLeft}>
            <Ionicons name="language-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Idioma</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{idiomaActual}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleCambiarMoneda}>
          <View style={styles.settingLeft}>
            <Ionicons name="cash-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Moneda</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{monedaActual}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleLimpiarCache}>
          <View style={styles.settingLeft}>
            <Ionicons name="trash-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Limpiar caché</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidad y seguridad</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="finger-print-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Acceso biométrico</Text>
          </View>
          <Switch
            value={settings.biometrico}
            onValueChange={(v) => actualizarSetting('biometrico', v)}
            trackColor={{ false: '#2C2C36', true: '#00FF87' }}
            thumbColor={settings.biometrico ? '#0D0D12' : '#8E8E93'}
          />
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Política de privacidad</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="document-text-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Términos y condiciones</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Soporte</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Centro de ayuda</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="mail-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Contactar soporte</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={22} color="#00FF87" />
            <Text style={styles.settingText}>Versión</Text>
          </View>
          <Text style={styles.settingValue}>1.0.0</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C24',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: '#8E8E93',
    fontSize: 14,
    marginRight: 8,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 40,
    backgroundColor: '#FF453A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});