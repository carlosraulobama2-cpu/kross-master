import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useEntradas } from '../context/EntradasContext';

interface ReviewsScreenProps {
  navigation: any;
  route: any;
}

interface Review {
  id: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
  usuarios: {
    nombre: string;
    nombre_artistico: string;
  };
}

export default function ReviewsScreen({ navigation, route }: ReviewsScreenProps) {
  const { eventoId, eventoNombre } = route.params || {};
  const { usuario, listarResenas, crearResena } = useEntradas();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarResenas();
  }, []);

  async function cargarResenas(): Promise<void> {
    try {
      setCargando(true);
      const result = await listarResenas(eventoId);
      setReviews(result.resenas || []);
    } catch (e) {
      console.error('Error cargando reseñas:', e);
    } finally {
      setCargando(false);
    }
  }

  const handleEnviar = async (): Promise<void> => {
    if (!comentario.trim()) {
      Alert.alert('Error', 'Escribe un comentario');
      return;
    }

    try {
      setEnviando(true);
      await crearResena(eventoId, calificacion, comentario);
      Alert.alert('Éxito', 'Reseña enviada');
      setComentario('');
      setCalificacion(5);
      await cargarResenas();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la reseña');
    } finally {
      setEnviando(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? 'star' : 'star-outline'}
        size={16}
        color={i < rating ? '#00FF87' : '#8E8E93'}
      />
    ));
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
        <Text style={styles.headerTitle}>Reseñas</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.eventoNombre}>{eventoNombre}</Text>

      <View style={styles.reviewForm}>
        <Text style={styles.formLabel}>Tu reseña</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setCalificacion(star)}>
              <Ionicons
                name={star <= calificacion ? 'star' : 'star-outline'}
                size={28}
                color={star <= calificacion ? '#00FF87' : '#8E8E93'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="Comparte tu experiencia..."
          placeholderTextColor="#8E8E93"
          value={comentario}
          onChangeText={setComentario}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity
          style={[styles.submitButton, enviando && styles.submitButtonDisabled]}
          onPress={handleEnviar}
          disabled={enviando}
        >
          <Text style={styles.submitButtonText}>
            {enviando ? 'Enviando...' : 'Enviar reseña'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reviewsList}>
        <Text style={styles.reviewsTitle}>Reseñas ({reviews.length})</Text>
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewAuthor}>
                {review.usuarios?.nombre_artistico || review.usuarios?.nombre || 'Usuario'}
              </Text>
              <View style={styles.starsRow}>{renderStars(review.calificacion)}</View>
            </View>
            <Text style={styles.reviewComment}>{review.comentario}</Text>
            <Text style={styles.reviewDate}>
              {new Date(review.creado_en).toLocaleDateString()}
            </Text>
          </View>
        ))}
        {reviews.length === 0 && (
          <Text style={styles.emptyText}>Aún no hay reseñas. ¡Sé el primero!</Text>
        )}
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
  eventoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reviewForm: {
    backgroundColor: '#1C1C24',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  formLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#111118',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0D0D12',
    fontWeight: '800',
    fontSize: 14,
  },
  reviewsList: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#1C1C24',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2C2C36',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewAuthor: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewComment: {
    color: '#A1A1A1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  reviewDate: {
    color: '#8E8E93',
    fontSize: 11,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginTop: 20,
  },
});
