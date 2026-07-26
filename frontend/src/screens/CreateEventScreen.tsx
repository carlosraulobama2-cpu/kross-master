import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useEntradas } from '../context/EntradasContext';
import * as ImagePicker from 'expo-image-picker';

interface CreateEventScreenProps {
  navigation: any;
}

const CATEGORIAS = ['Conciertos', 'Festivales', 'Deportes', 'Teatro', 'Otro'];

export default function CreateEventScreen({ navigation }: CreateEventScreenProps) {
  const { usuario, aceptarTerminos } = useEntradas();
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
  const [aceptaTerminosArtista, setAceptaTerminosArtista] = useState<boolean>(false);
  const [mostrarTerminos, setMostrarTerminos] = useState<boolean>(false);

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

    if (!aceptaTerminosArtista) {
      Alert.alert('Términos requeridos', 'Debes aceptar las Condiciones para Organizadores antes de publicar');
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

      await aceptarTerminos('1.0', 'terminos_artista');

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

        <TouchableOpacity style={styles.termsRow} onPress={() => setMostrarTerminos(true)}>
          <Text style={styles.termsLink}>Ver Condiciones para Organizadores de Eventos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.termsCheckboxRow} onPress={() => setAceptaTerminosArtista(!aceptaTerminosArtista)}>
          <View style={[styles.checkbox, aceptaTerminosArtista && styles.checkboxChecked]}>
            {aceptaTerminosArtista && <Ionicons name="checkmark" size={16} color="#0D0D12" />}
          </View>
          <Text style={styles.termsCheckboxText}>
            He leído y acepto las Condiciones y Responsabilidades para la Publicación de Eventos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createButton, cargando && styles.createButtonDisabled]}
          onPress={handleCrear}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator size="small" color="#0D0D12" />
          ) : (
            <Text style={styles.createButtonText}>Publicar Concierto</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={mostrarTerminos} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMostrarTerminos(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Condiciones para Organizadores</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              CONDICIONES Y RESPONSABILIDADES PARA LA PUBLICACIÓN DE EVENTOS EN KROOS MASTER
              {'\n\n'}
              1. Licencias y Autorizaciones Legales
              {'\n'}
              Permisos del Local: Declaras contar con la reserva, contrato o permiso expreso del recinto o sala donde se celebrará el evento.
              {'\n\n'}
              Derecho de Autor (SGAE / Derechos de Ejecución): Declaras ser el titular de las obras a interpretar o contar con las licencias correspondientes para la comunicación pública de música en directo. Kroos Master no asume pagos de derechos de autor derivados del show.
              {'\n\n'}
              Seguros y Normativa: Asumes la responsabilidad de disponer de los seguros de responsabilidad civil exigidos por la ley local/autonómica para la realización de espectáculos públicos.
              {'\n\n'}
              2. Aforo y Control de Accesos
              {'\n'}
              Límite de Aforo: Te comprometes a fijar un número total de entradas que nunca supere el aforo máximo legal permitido en el recinto.
              {'\n\n'}
              Uso Exclusivo del Escáner: El control de accesos debe realizarse a través de la herramienta oficial de la app mediante lectura de códigos QR. Kroos Master no se hace responsable de sobreaforos causados por accesos no registrados o venta en puerta fuera del sistema.
              {'\n\n'}
              Asignación de Staff: Eres el único responsable del uso que tu equipo o porteros hagan de los permisos de escaneo (PIN o invitaciones de correo) que otorgues desde tu panel de control.
              {'\n\n'}
              3. Cobros, Comisiones y Facturación
              {'\n'}
              Vinculación con Stripe Connect: Aceptas que todos los ingresos procedentes de la venta de entradas se procesen y transfieran a través de tu cuenta de Stripe Connect vinculada.
              {'\n\n'}
              Retención de Gastos de Gestión: Aceptas que Kroos Master aplique y retenga directamente la comisión o gasto de gestión acordado por cada entrada vendida.
              {'\n\n'}
              Obligaciones Fiscales: Eres el único responsable de declarar los ingresos obtenidos por la venta de entradas ante la hacienda pública (Hacienda/AEAT) y de emitir la correspondiente factura simplificada o ticket al comprador si este la solicita.
              {'\n\n'}
              4. Cancelaciones, Aplazamientos y Devoluciones
              {'\n'}
              Responsabilidad de Reembolso: En caso de cancelación definitiva del show, te comprometes a asumir la devolución íntegra del importe de las entradas a los compradores. La orden de reembolso se tramitará desde tu panel y los fondos se devolverán desde tu cuenta de Stripe.
              {'\n\n'}
              Cambios de Fecha u Horario: Si el evento cambia de fecha o ubicación, te comprometes a notificarlo a los asistentes a través de las herramientas de la app con un mínimo de 48 horas de antelación.
              {'\n\n'}
              Cancelación de Cuenta por Incumplimiento: Si Kroos Master detecta un evento falso, fraudulento o con indicios de estafa, se reserva el derecho de congelar las transferencias, cancelar el evento y dar de baja la cuenta del organizador de inmediato.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setMostrarTerminos(false)}>
            <Text style={styles.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  termsRow: {
    marginBottom: 12,
  },
  termsLink: {
    color: '#00FF87',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1C1C24',
    borderWidth: 2,
    borderColor: '#2C2C36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00FF87',
    borderColor: '#00FF87',
  },
  termsCheckboxText: {
    color: '#A1A1A1',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C24',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalText: {
    color: '#E5E5EA',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  modalCloseButton: {
    backgroundColor: '#00FF87',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
  },
});