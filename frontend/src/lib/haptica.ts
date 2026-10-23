import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const activa = Platform.OS === 'ios' || Platform.OS === 'android';

/** Respuesta táctil sutil y coherente en toda la app. */
export const haptica = {
  toque: () => activa && void Haptics.selectionAsync(),
  impacto: () => activa && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  exito: () => activa && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => activa && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
