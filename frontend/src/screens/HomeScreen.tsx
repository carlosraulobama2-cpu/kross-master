import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useEntradas } from '../context/EntradasContext';

interface HomeScreenProps {
  navigation: any;
}

const CATEGORIAS = ['Todos', 'Conciertos', 'Festivales', 'Deportes', 'Teatro'];

function formatearFecha(fechaEvento: string): string {
  if (!fechaEvento) return '';
  const d = new Date(fechaEvento);
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const mes = meses[d.getMonth()];
  const dia = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${mes} • ${hh}:${mm} HS`;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { usuario } = useEntradas();
  const [categoriaSel, setCategoriaSel] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    cargarEventos();
  }, []);

  async function cargarEventos(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*, usuarios:artista_id(nombre_artistico, nombre)')
        .order('fecha_evento', { ascending: true });

      if (error) throw error;
      setEventos(data || []);
    } catch (e) {
      console.error('Error cargando eventos:', e);
    } finally {
      setCargando(false);
    }
  }

  const handleProfilePress = (): void => {
    navigation.navigate('Profile');
  };

  const eventosFiltrados = eventos.filter((e) => {
    const coincideCategoria = categoriaSel === 'Todos' || e.categoria === categoriaSel;
    const coincideBusqueda =
      !busqueda ||
      e.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.lugar && e.lugar.toLowerCase().includes(busqueda.toLowerCase())) ||
      (e.usuarios?.nombre_artistico && e.usuarios.nombre_artistico.toLowerCase().includes(busqueda.toLowerCase())) ||
      (e.usuarios?.nombre && e.usuarios.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    const min = Number(precioMin);
    const max = Number(precioMax);
    const coincidePrecio =
      (!precioMin || Number(e.precio) >= min) &&
      (!precioMax || Number(e.precio) <= max);

    return coincideCategoria && coincideBusqueda && coincidePrecio;
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('EventDetail', { item })}
    >
      <Image source={{ uri: item.imagen_url || item.imagen }} style={styles.cardImage} />
      <View style={styles.cardOverlay} />
      <View style={styles.cardContent}>
        <View style={styles.badgeContainer}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={14} color="#00FF87" />
          <Text style={styles.badgeText}>Disponibles</Text>
        </View>
        <Text style={styles.eventTitle}>{item.titulo}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#00FF87" />
          <Text style={styles.infoText}>{formatearFecha(item.fecha_evento)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#A1A1A1" />
          <Text style={styles.infoText}>{item.lugar || 'Por confirmar'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>
            Desde <Text style={styles.priceAmount}>{Number(item.precio).toFixed(2)} €</Text>
          </Text>
          <View style={styles.buyButton}>
            <Text style={styles.buyButtonText}>Consigue tu Pase</Text>
            <Ionicons name="arrow-forward" size={16} color="#0D0D12" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D12" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            KROOS <Text style={styles.brandAccent}>MASTER</Text>
          </Text>
          <Text style={styles.subTitle}>Consigue tu acceso al instante</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.createEventButton} onPress={() => navigation.navigate('CreateEvent')}>
            <Ionicons name="add" size={20} color="#0D0D12" />
            <Text style={styles.createEventText}>Crear Evento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Ionicons name="person-circle-outline" size={36} color="#00FF87" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.staffButton} onPress={() => navigation.navigate('StaffLogin')}>
            <Ionicons name="scan-outline" size={28} color="#00FF87" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar evento, artista o recinto..."
            placeholderTextColor="#8E8E93"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <View style={styles.priceFilterRow}>
          <TextInput
            style={styles.priceInput}
            placeholder="Precio mín."
            placeholderTextColor="#8E8E93"
            value={precioMin}
            onChangeText={setPrecioMin}
            keyboardType="decimal-pad"
          />
          <Text style={styles.priceSeparator}>-</Text>
          <TextInput
            style={styles.priceInput}
            placeholder="Precio máx."
            placeholderTextColor="#8E8E93"
            value={precioMax}
            onChangeText={setPrecioMax}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIAS.map((cat) => {
              const esActivo = categoriaSel === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, esActivo && styles.chipActivo]}
                  onPress={() => setCategoriaSel(cat)}
                >
                  <Text style={[styles.chipText, esActivo && styles.chipTextActivo]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximos Eventos</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {cargando ? (
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        ) : (
          <FlatList
            data={eventosFiltrados}
            keyExtractor={(item: any) => item.id}
            scrollEnabled={false}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No hay eventos para esta categoría.</Text>
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  brandTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  brandAccent: { color: '#00FF87' },
  subTitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  profileButton: { padding: 2 },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF87',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  createEventText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C36',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 48,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  priceFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#1C1C24',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    fontSize: 13,
  },
  priceSeparator: { color: '#8E8E93', fontWeight: '700' },
  categoriesContainer: { marginBottom: 20, paddingLeft: 20 },
  chip: {
    backgroundColor: '#1C1C24',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  chipActivo: { backgroundColor: '#00FF87', borderColor: '#00FF87' },
  chipText: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  chipTextActivo: { color: '#0D0D12', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  seeAllText: { fontSize: 13, color: '#00FF87', fontWeight: '600' },
  loadingText: { textAlign: 'center', color: '#8E8E93', marginTop: 20 },
  emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 20 },
  card: {
    backgroundColor: '#1C1C24',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardImage: { width: '100%', height: 180 },
  cardOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(13, 13, 18, 0.45)' },
  cardContent: { padding: 16 },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 135, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  badgeText: { color: '#00FF87', fontSize: 11, fontWeight: '700', marginLeft: 5 },
  eventTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { color: '#A1A1A1', fontSize: 13, marginLeft: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C36',
  },
  priceText: { color: '#8E8E93', fontSize: 12 },
  priceAmount: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF87',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyButtonText: { color: '#0D0D12', fontWeight: '800', fontSize: 13, marginRight: 6 },
});