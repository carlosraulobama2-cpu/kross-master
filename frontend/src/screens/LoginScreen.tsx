import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login } = useEntradas();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rol, setRol] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (): Promise<void> => {
    try {
      setCargando(true);
      setError('');
      await login(email, password);
      navigation.goBack();
    } catch (e) {
      setError('Credenciales inválidas');
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
        <Text style={styles.headerTitle}>Iniciar Sesión</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#8E8E93"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Entrar como</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, rol === 'fan' && styles.roleButtonActive]}
            onPress={() => setRol('fan')}
          >
            <Ionicons name="person-outline" size={20} color={rol === 'fan' ? '#0D0D12' : '#8E8E93'} />
            <Text style={[styles.roleText, rol === 'fan' && styles.roleTextActive]}>Usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, rol === 'artista' && styles.roleButtonActive]}
            onPress={() => setRol('artista')}
          >
            <Ionicons name="musical-notes-outline" size={20} color={rol === 'artista' ? '#0D0D12' : '#8E8E93'} />
            <Text style={[styles.roleText, rol === 'artista' && styles.roleTextActive]}>Artista</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, cargando && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={cargando}
        >
          <Text style={styles.loginButtonText}>
            {cargando ? 'Cargando...' : 'Entrar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
          <Text style={styles.registerLink}>¿No tienes cuenta? Regístrate</Text>
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
  errorText: {
    color: '#FF453A',
    marginBottom: 12,
    textAlign: 'center',
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
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C1C24',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  roleButtonActive: {
    backgroundColor: '#00FF87',
    borderColor: '#00FF87',
  },
  roleText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '700',
  },
  roleTextActive: {
    color: '#0D0D12',
  },
  loginButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
  registerLink: {
    color: '#00FF87',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
});
