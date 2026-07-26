import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

export default function ProfileScreen({ navigation }) {
  const { usuario, logout } = useEntradas();

  const handleLogout = async () => {
    try {
      await logout();
      navigation.replace('Home');
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  const handleMisEntradas = () => {
    navigation.navigate('MisEntradas');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#00FF87" />
        </View>
        <Text style={styles.userName}>{usuario?.email || 'Invitado'}</Text>
        <Text style={styles.userRole}>{usuario ? 'Fan' : 'Sin cuenta'}</Text>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ScanQR')}>
          <Ionicons name="qr-code-outline" size={22} color="#00FF87" />
          <Text style={styles.menuText}>Escanear QR</Text>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleMisEntradas} disabled={!usuario}>
          <Ionicons name="ticket-outline" size={22} color={usuario ? '#00FF87' : '#8E8E93'} />
          <Text style={[styles.menuText, !usuario && styles.menuTextDisabled]}>Mis Entradas</Text>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="heart-outline" size={22} color="#00FF87" />
          <Text style={styles.menuText}>Favoritos</Text>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color="#00FF87" />
          <Text style={styles.menuText}>Configuración</Text>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={22} color="#00FF87" />
          <Text style={styles.menuText}>Ayuda</Text>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {usuario ? (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      )}
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
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C1C24',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#00FF87',
    fontWeight: '600',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  menuText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    marginLeft: 12,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
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
  loginButton: {
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  loginText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
});
