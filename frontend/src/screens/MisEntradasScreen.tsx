import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface MisEntradasScreenProps {
  navigation: any;
}

interface TicketMetaProps {
  codigoQr: string;
}

function TicketMeta({ codigoQr }: TicketMetaProps) {
  let meta = {} as Record<string, string>;
  try {
    meta = JSON.parse(codigoQr);
  } catch (e) {
    meta = { ticket_id: codigoQr };
  }

  return (
    <View style={styles.metaContainer}>
      <Text style={styles.metaTitle}>Datos del ticket</Text>
      <Text style={styles.metaText}>Ticket: {meta.ticket_id}</Text>
      <Text style={styles.metaText}>Evento: {meta.event_id}</Text>
      <Text style={styles.metaText}>Asiento: {meta.seat}</Text>
      <Text style={styles.metaText}>Firma: {meta.firma}</Text>
    </View>
  );
}

export default function MisEntradasScreen({ navigation }: MisEntradasScreenProps) {
  const { entradas } = useEntradas();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Entradas</Text>
        <View style={{ width: 24 }} />
      </View>

      {entradas.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aún no tienes entradas</Text>
          <Text style={styles.emptySub}>Compra una para verla aquí con tu QR</Text>
        </View>
      ) : (
        entradas.map((entrada: any) => (
          <TouchableOpacity
            key={entrada.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TicketDetail', { entrada })}
          >
            <Image source={{ uri: entrada.imagen_url || entrada.imagen }} style={styles.cardImage} />
            <View style={styles.cardOverlay} />
            <View style={styles.cardContent}>
              <Text style={styles.title}>{entrada.eventos?.titulo || entrada.titulo}</Text>
              <Text style={styles.info}>{entrada.eventos?.fecha_evento || entrada.fecha}</Text>
              <Text style={styles.info}>{entrada.eventos?.lugar || entrada.lugar}</Text>

              <View style={styles.qrContainer}>
                <QRCode value={entrada.codigo_qr || entrada.codigoQr} size={160} />
              </View>
              <Text style={styles.qrLabel}>Toca para ver tu entrada</Text>
            </View>
          </TouchableOpacity>
        ))
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
  card: {
    backgroundColor: '#1C1C24',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 13, 18, 0.35)',
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    color: '#A1A1A1',
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  qrContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  qrLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  metaContainer: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 12,
  },
  metaTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 6,
  },
  metaText: {
    color: '#A1A1A1',
    fontSize: 12,
    marginBottom: 2,
  },
});