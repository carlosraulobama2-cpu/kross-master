import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useEntradas } from '../context/EntradasContext';
import * as ImagePicker from 'expo-image-picker';

interface CreateEventScreenProps {
  navigation: any;
}

const CATEGORIAS = ['Conciertos', 'Festivales', 'Deportes', 'Teatro', 'Otro'];

export default function CreateEventScreen({ navigation }: CreateEventScreenProps) {
  const { usuario } = useEntradas();
  const [titulo, setTitulo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0]);
  const [fechaEvento, setFechaEvento] = useState<string>('');
  const [precio, setPrecio] = useState<string>('');
  const [aforoTotal, setAforoTotal] = useState<string>('');
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [imagenLocal, setImagenLocal] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(false);

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
        setImagenLocal(result.assets[0].uri);
        setImagenUrl(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleCrear = async (): Promise<void> => {
    if (!titulo || !fechaEvento || !precio || !aforoTotal || !lugar) {
      Alert.alert('Faltan datos', 'Completa los campos obligatorios');
      return;
    }

    try {
      setCargando(true);

      const { data, error } = await supabase
        .from('eventos')
        .insert([{
          titulo,
          descripcion,
          lugar,
          categoria,
          fecha_evento: new Date(fechaEvento).toISOString(),
          precio: parseFloat(precio),
          aforo_total: parseInt(aforoTotal),
          entradas_disponibles: parseInt(aforoTotal),
          imagen_url: imagenUrl || null,
        }])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Éxito', 'Evento creado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
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
        <Text style={styles.headerTitle}>Crear Evento</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Título del evento *"
          placeholderTextColor="#8E8E93"
          value={titulo}
          onChangeText={setTitulo}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descripción"
          placeholderTextColor="#8E8E93"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={3}
        />

        <TextInput
          style={styles.input}
          placeholder="Lugar *"
          placeholderTextColor="#8E8E93"
          value={lugar}
          onChangeText={setLugar}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {CATEGORIAS.map((cat) => {
            const selected = categoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}
                onPress={() => setCategoria(cat)}
              >
                <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TextInput
          style={styles.input}
          placeholder="Fecha y hora (ej: 2026-08-15T21:00:00) *"
          placeholderTextColor="#8E8E93"
          value={fechaEvento}
          onChangeText={setFechaEvento}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Precio (€) *"
            placeholderTextColor="#8E8E93"
            value={precio}
            onChangeText={setPrecio}
            keyboardType="decimal-pad"
          />

          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Aforo total *"
            placeholderTextColor="#8E8E93"
            value={aforoTotal}
            onChangeText={setAforoTotal}
            keyboardType="number-pad"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="URL de imagen (opcional)"
          placeholderTextColor="#8E8E93"
          value={imagenUrl}
          onChangeText={setImagenUrl}
        />

        <TouchableOpacity style={styles.imagePickerButton} onPress={seleccionarImagen}>
          <Ionicons name="image-outline" size={20} color="#00FF87" />
          <Text style={styles.imagePickerText}>Seleccionar imagen del dispositivo</Text>
        </TouchableOpacity>

        {imagenLocal ? <Image source={{ uri: imagenLocal }} style={styles.previewImage} /> : null}

        <TouchableOpacity
          style={[styles.createButton, cargando && styles.createButtonDisabled]}
          onPress={handleCrear}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator size="small" color="#0D0D12" />
          ) : (
            <Text style={styles.createButtonText}>Crear Evento</Text>
          )}
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
  input: {
    backgroundColor: '#1C1C24',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#1C1C24',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  categoryChipActive: {
    backgroundColor: '#00FF87',
    borderColor: '#00FF87',
  },
  categoryText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#0D0D12',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  createButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C1C24',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    marginBottom: 12,
  },
  imagePickerText: {
    color: '#00FF87',
    fontSize: 14,
    fontWeight: '700',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
});