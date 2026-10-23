import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Almacén de secretos: Keychain/Keystore en el móvil, localStorage en web. */
export const almacenSeguro = {
  async leer(clave: string): Promise<string | null> {
    if (Platform.OS === 'web') return AsyncStorage.getItem(clave);
    return SecureStore.getItemAsync(clave);
  },
  async guardar(clave: string, valor: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      if (valor === null) await AsyncStorage.removeItem(clave);
      else await AsyncStorage.setItem(clave, valor);
      return;
    }
    if (valor === null) await SecureStore.deleteItemAsync(clave);
    else await SecureStore.setItemAsync(clave, valor);
  },
};
