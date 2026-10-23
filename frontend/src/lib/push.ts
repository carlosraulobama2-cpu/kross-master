import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Pide permiso y registra el token de Expo Push en la cuenta. Silencioso si falla. */
export async function registrarPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'General', importance: Notifications.AndroidImportance.HIGH });
    }
    const actual = await Notifications.getPermissionsAsync();
    const permiso = actual.granted ? actual : await Notifications.requestPermissionsAsync();
    if (!permiso.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api('/me/push-token', { method: 'PUT', body: { token: data } });
  } catch {
    // Las notificaciones son opcionales: la app funciona sin ellas.
  }
}
