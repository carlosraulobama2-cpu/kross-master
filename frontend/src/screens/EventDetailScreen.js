import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

const ASIENTOS = ['A-12', 'A-13', 'B-05', 'B-06', 'C-01'];

export default function EventDetailScreen({ route, navigation }) {
  const { item } = route.params || {};
  const { comprarEntrada, usuario } = useEntradas();
  const [seat, setSeat] = useState(ASIENTOS[0]);
  const [cargando, setCargando] = useState(false);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Evento no encontrado</Text>
      </View>
    );
  }

  const handleBuy = async () => {
    if (!usuario) {
      navigation.navigate('Login');
      return;
    }

    navigation.navigate('Payment', {
      evento: item,
      seat,
      onPagoExitoso: async () => {
        await comprarEntrada(item, seat);
        navigation.navigate('MisEntradas');
      },
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: item.imagen }} style={styles.heroImage} />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{item.titulo}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#00FF87" />
          <Text style={styles.infoText}>{item.fecha}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color="#A1A1A1" />
          <Text style={styles.infoText}>{item.lugar}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Precio desde</Text>
          <Text style={styles.priceValue}>{item.precio}</Text>
        </View>

        <Text style={styles.sectionLabel}>Selecciona tu asiento</Text>
        <View style={styles.seatRow}>
          {ASIENTOS.map((s) => {
            const selected = seat === s;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.seatChip, selected && styles.seatChipActive]}
                onPress={() => setSeat(s)}
              >
                <Text style={[styles.seatText, selected && styles.seatTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.buyButton, cargando && styles.buyButtonDisabled]} 
          onPress={handleBuy}
          disabled={cargando}
        >
          <Text style={styles.buyButtonText}>
            {cargando ? 'Procesando...' : 'Pagar y Obtener Pase'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#0D0D12" />
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
  heroImage: {
    width: '100%',
    height: 260,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    marginTop: -30,
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    color: '#E5E5EA',
    fontSize: 15,
    marginLeft: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2C2C36',
    marginBottom: 20,
  },
  priceLabel: {
    color: '#8E8E93',
    fontSize: 14,
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  seatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  seatChip: {
    backgroundColor: '#1C1C24',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  seatChipActive: {
    backgroundColor: '#00FF87',
    borderColor: '#00FF87',
  },
  seatText: {
    color: '#8E8E93',
    fontWeight: '700',
    fontSize: 13,
  },
  seatTextActive: {
    color: '#0D0D12',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 14,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 15,
    marginRight: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
