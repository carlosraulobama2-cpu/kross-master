import { Linking } from 'react-native';
import { API_URL } from './api';

/** Abre el .ics del evento: el sistema ofrece añadirlo al calendario. */
export const anadirAlCalendario = (eventoId: string) => Linking.openURL(`${API_URL}/api/eventos/${eventoId}/calendario.ics`);

/** Los enlaces de la API pueden venir relativos si no hay PUBLIC_API_URL. */
export const urlAbsoluta = (url: string) => (url.startsWith('/') ? `${API_URL}${url}` : url);
