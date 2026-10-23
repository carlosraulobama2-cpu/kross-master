import { Alert, Platform } from 'react-native';

/** Confirmación que funciona igual en móvil y en web. */
export function confirmar(titulo: string, mensaje: string, accion: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((ok) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => ok(false) },
      { text: accion, onPress: () => ok(true) },
    ]),
  );
}
