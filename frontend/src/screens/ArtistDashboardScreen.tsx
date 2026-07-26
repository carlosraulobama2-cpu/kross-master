import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useEntradas } from '../context/EntradasContext';

interface ArtistDashboardProps {
  navigation: any;
}

interface EventoArtista {
  id: string;
  titulo: string;
  categoria: string;
  fecha_evento: string;
  precio: number;
  entradas_disponibles: number;
  aforo_total: number;
}

export default function ArtistDashboard({ navigation }: ArtistDashboardProps) {
  const { usuario } = useEntradas();
  const [eventos, setEventos] = useState<EventoArtista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [stats, setStats] = useState({ totalEventos: 0, totalEntradasVendidas: 0, ingresosTotales: 0 });

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(): Promise<void> {
    try {
      setCargando(true);
      if (!usuario?.id) return;

      const { data: eventosData, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('artista_id', usuario.id)
        .order('fecha_evento', { ascending: true });

      if (error) throw error;
      setEventos(eventosData || []);

      const totalEventos = eventosData?.length || 0;
      const totalEntradasVendidas = eventosData?.reduce((sum, e) => sum + (e.aforo_total - e.entradas_disponibles), 0) || 0;
      const ingresosTotales = eventosData?.reduce((sum, e) => sum + (e.aforo_total - e.entradas_disponibles) * e.precio, 0) || 0;

      setStats({ totalEventos, totalEntradasVendidas, ingresosTotales });
    } catch (e) {
      console.error('Error cargando dashboard:', e);
    } finally {
      setCargando(false);
    }
  }

  const renderEvento = ({ item }: { item: EventoArtista }) => {
    const vendidas = item.aforo_total - item.entradas_disponibles;
    const porcentaje = Math.round((vendidas / item.aforo_total) * 100);

    return (
      <View style={styles.eventoCard}>
        <View style={styles.eventoHeader}>
          <Text style={styles.eventoTitulo}>{item.titulo}</Text>
          <View style={styles.porcentajeBadge}>
            <Text style={styles.porcentajeText}>{porcentaje}%</Text>
          </View>
        </View>
        <Text style={styles.eventoInfo}>{item.categoria} • {new Date(item.fecha_evento).toLocaleDateString()}</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${porcentaje}%` }]} />
        </View>
        <View style={styles.eventoStats}>
          <View style={styles.statItem}>
            <Ionicons name="ticket-outline" size={16} color="#00FF87" />
            <Text style={styles.statText}>{vendidas}/{item.aforo_total}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color="#00FF87" />
            <Text style={styles.statText}>{(vendidas * item.precio).toFixed(2)} €</Text>
          </View>
        </View>
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00FF87" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard Artista</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={24} color="#00FF87" />
          <Text style={styles.statValue}>{stats.totalEventos}</Text>
          <Text style={styles.statLabel}>Eventos</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="ticket-outline" size={24} color="#00FF87" />
          <Text style={styles.statValue}>{stats.totalEntradasVendidas}</Text>
          <Text style={styles.statLabel}>Entradas</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={24} color="#00FF87" />
          <Text style={styles.statValue}>{stats.ingresosTotales.toFixed(2)} €</Text>
          <Text style={styles.statLabel}>Ingresos</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis Eventos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
          <Text style={styles.createText}>Crear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={eventos}
        keyExtractor={(item) => item.id}
        renderItem={renderEvento}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tienes eventos creados</Text>
        }
      />
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C24',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createText: {
    fontSize: 14,
    color: '#00FF87',
    fontWeight: '700',
  },
  eventoCard: {
    backgroundColor: '#1C1C24',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  porcentajeBadge: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  porcentajeText: {
    color: '#00FF87',
    fontSize: 12,
    fontWeight: '700',
  },
  eventoInfo: {
    color: '#A1A1A1',
    fontSize: 13,
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#2C2C36',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF87',
  },
  eventoStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 20,
  },
});
