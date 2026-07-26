import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEntradas } from '../context/EntradasContext';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { usuario, actualizarPerfil } = useEntradas();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [nombreArtistico, setNombreArtistico] = useState('');
  const [bio, setBio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');

  const seleccionarImagen = async (): Promise<void> => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFotoPerfil(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre || '');
      setNombreArtistico(usuario.nombre_artistico || '');
      setBio(usuario.bio || '');
      setTelefono(usuario.telefono || '');
      setSitioWeb(usuario.sitio_web || '');
      setFotoPerfil(usuario.foto_perfil || usuario.imagen_url || '');
    }
  }, [usuario]);

  const handleGuardar = async (): Promise<void> => {
    try {
      setGuardando(true);
      await actualizarPerfil({
        nombre,
        nombre_artistico: nombreArtistico,
        bio,
        telefono,
        sitio_web: sitioWeb,
        foto_perfil: fotoPerfil,
        imagen_url: fotoPerfil,
      });
      setEditando(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      const { logout } = useEntradas();
      await logout();
      navigation.replace('Home');
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  const esArtista = usuario?.rol === 'artista';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <TouchableOpacity onPress={() => setEditando(!editando)}>
          <Text style={styles.editButtonText}>{editando ? 'Cancelar' : 'Editar'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={editando ? seleccionarImagen : undefined}>
          {fotoPerfil ? (
            <Image source={{ uri: fotoPerfil }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person-circle-outline" size={80} color="#00FF87" />
          )}
          {editando && (
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.userName}>{usuario?.email || 'Invitado'}</Text>
        <Text style={styles.userRole}>{usuario?.rol === 'artista' ? 'Artista' : usuario?.rol === 'admin' ? 'Admin' : 'Fan'}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={[styles.input, !editando && styles.inputDisabled]}
          value={nombre}
          onChangeText={setNombre}
          editable={editando}
          placeholder="Tu nombre"
          placeholderTextColor="#8E8E93"
        />

        {esArtista && (
          <>
            <Text style={styles.label}>Nombre artístico</Text>
            <TextInput
              style={[styles.input, !editando && styles.inputDisabled]}
              value={nombreArtistico}
              onChangeText={setNombreArtistico}
              editable={editando}
              placeholder="Nombre artístico"
              placeholderTextColor="#8E8E93"
            />
          </>
        )}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.textArea, !editando && styles.inputDisabled]}
          value={bio}
          onChangeText={setBio}
          editable={editando}
          placeholder="Cuéntanos sobre ti..."
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={[styles.input, !editando && styles.inputDisabled]}
          value={telefono}
          onChangeText={setTelefono}
          editable={editando}
          placeholder="+34 600 000 000"
          placeholderTextColor="#8E8E93"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Sitio web</Text>
        <TextInput
          style={[styles.input, !editando && styles.inputDisabled]}
          value={sitioWeb}
          onChangeText={setSitioWeb}
          editable={editando}
          placeholder="https://tusitio.com"
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>URL de foto de perfil</Text>
        <TextInput
          style={[styles.input, !editando && styles.inputDisabled]}
          value={fotoPerfil}
          onChangeText={setFotoPerfil}
          editable={editando}
          placeholder="https://..."
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
        />

        {editando && (
          <TouchableOpacity
            style={[styles.saveButton, guardando && styles.saveButtonDisabled]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            <Text style={styles.saveButtonText}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {usuario && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
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
  editButtonText: {
    color: '#00FF87',
    fontSize: 14,
    fontWeight: '700',
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#00FF87',
    borderRadius: 12,
    padding: 4,
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
  form: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1C1C24',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  inputDisabled: {
    opacity: 0.7,
  },
  textArea: {
    backgroundColor: '#1C1C24',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  saveButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 30,
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
