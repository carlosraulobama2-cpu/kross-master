import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { buildQrPayload } from '../utils/qrSigner';

interface TicketDetailScreenProps {
  route: any;
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

export default function TicketDetailScreen({ route, navigation }: TicketDetailScreenProps) {
  const { entrada } = route.params || {};

  if (!entrada) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Entrada no encontrada</Text>
      </View>
    );
  }

  const esUsado = entrada.estado === 'USADO';

  const compartirEntrada = async (): Promise<void> => {
    try {
      const mensaje = `¡Aquí está mi entrada para ${entrada.titulo || entrada.eventos?.titulo}!\nAsiento: ${entrada.asiento}\nCódigo QR: ${entrada.codigo_qr || entrada.codigoQr}`;
      await Share.share({ message: mensaje, title: 'Mi entrada Kroos Master' });
    } catch (e) {
      console.error('Error al compartir:', e);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Entrada</Text>
        <TouchableOpacity onPress={compartirEntrada}>
          <Ionicons name="share-outline" size={24} color="#00FF87" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, esUsado ? styles.statusBadgeUsed : styles.statusBadgeValid]}>
          <Text style={styles.statusText}>{entrada.estado}</Text>
        </View>
      </View>

      <View style={styles.qrSection}>
        <View style={styles.qrWrapper}>
          <QRCode value={entrada.codigo_qr || entrada.codigoQr} size={220} />
        </View>
        <Text style={styles.qrLabel}>Muestra este código en la puerta</Text>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.eventTitle}>{entrada.titulo || entrada.eventos?.titulo}</Text>
        <Text style={styles.eventDetail}>
          {entrada.fecha || entrada.eventos?.fecha_evento}
        </Text>
        <Text style={styles.eventDetail}>
          {entrada.lugar || entrada.eventos?.lugar}
        </Text>
        <Text style={styles.eventDetail}>Asiento: {entrada.asiento}</Text>
        <Text style={styles.eventPrice}>Pagado: {Number(entrada.precio_pagado || entrada.precio).toFixed(2)} €</Text>

        <TicketMeta codigoQr={entrada.codigo_qr || entrada.codigoQr} />
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
  statusContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeValid: {
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
  },
  statusBadgeUsed: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  statusText: {
    color: '#00FF87',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  qrLabel: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 14,
    textAlign: 'center',
  },
  detailsContainer: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  eventDetail: {
    color: '#A1A1A1',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  eventPrice: {
    color: '#00FF87',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  metaContainer: {
    width: '100%',
    backgroundColor: '#111118',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
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
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});