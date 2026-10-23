import { Alert, Platform } from 'react-native';
import { traducir as tx } from './i18n';

/** Confirmación que funciona igual en móvil y en web. */
export function confirmar(tituloEs: string, mensajeEs: string, accionEs: string): Promise<boolean> {
  const [titulo, mensaje, accion] = [tx(tituloEs), tx(mensajeEs), tx(accionEs)];
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((ok) =>
    Alert.alert(titulo, mensaje, [
      { text: tx('Cancelar'), style: 'cancel', onPress: () => ok(false) },
      { text: accion, onPress: () => ok(true) },
    ]),
  );
}
