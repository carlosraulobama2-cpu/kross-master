import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEntradas } from '../context/EntradasContext';

interface OnboardingScreenProps {
  navigation?: any;
}

interface Slide {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    titulo: 'Descubre eventos',
    descripcion: 'Busca conciertos, festivales, deportes y teatro.',
    imagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    titulo: 'Compra al instante',
    descripcion: 'Elige asiento y paga de forma segura.',
    imagen: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    titulo: 'Tu QR listo',
    descripcion: 'Accede al evento con tu entrada digital.',
    imagen: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
  },
];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { marcarOnboardingCompletado } = useEntradas();
  const [index, setIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const handleNext = async (): Promise<void> => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * 300, animated: true });
    } else {
      await marcarOnboardingCompletado();
      navigation.replace('Home');
    }
  };

  const handleSkip = async (): Promise<void> => {
    await marcarOnboardingCompletado();
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <Image source={{ uri: slide.imagen }} style={styles.slideImage} />
            <View style={styles.slideOverlay} />
            <View style={styles.slideContent}>
              <Text style={styles.slideTitle}>{slide.titulo}</Text>
              <Text style={styles.slideDesc}>{slide.descripcion}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#0D0D12" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D12',
  },
  slide: {
    width: 300,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: 300,
    height: '60%',
    borderRadius: 20,
  },
  slideOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 13, 18, 0.2)',
    borderRadius: 20,
  },
  slideContent: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 14,
    color: '#A1A1A1',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C2C36',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#00FF87',
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00FF87',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  nextText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
});