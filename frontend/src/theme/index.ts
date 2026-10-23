import { Platform, type TextStyle } from 'react-native';

/** Tokens de diseño. Todo color, tamaño y radio de la app sale de aquí. */
export const color = {
  fondo: '#0B0B10',
  superficie: '#15151D',
  superficie2: '#1E1E29',
  superficie3: '#272734',
  borde: '#2A2A37',
  bordeFuerte: '#3A3A4A',
  texto: '#F5F5F8',
  texto2: '#A3A3B5',
  texto3: '#6B6B80',
  acento: '#00FF87',
  acentoOscuro: '#00C96B',
  acentoTexto: '#03140A',
  acentoSuave: 'rgba(0, 255, 135, 0.12)',
  peligro: '#FF4D5E',
  peligroSuave: 'rgba(255, 77, 94, 0.14)',
  aviso: '#FFC93C',
  avisoSuave: 'rgba(255, 201, 60, 0.14)',
  info: '#5AC8FA',
  infoSuave: 'rgba(90, 200, 250, 0.14)',
  velo: 'rgba(5, 5, 8, 0.72)',
  blanco: '#FFFFFF',
} as const;

export const espacio = { xxs: 2, xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, enorme: 48 } as const;

export const radio = { s: 8, m: 12, l: 16, xl: 22, xxl: 28, total: 999 } as const;

const familia = Platform.select({ ios: 'System', android: 'sans-serif', default: 'Inter, system-ui, -apple-system, sans-serif' });

export const tipo = {
  display: { fontFamily: familia, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  titulo: { fontFamily: familia, fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitulo: { fontFamily: familia, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  cabecera: { fontFamily: familia, fontSize: 17, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  cuerpo: { fontFamily: familia, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  cuerpoFuerte: { fontFamily: familia, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  nota: { fontFamily: familia, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  mini: { fontFamily: familia, fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  cifra: { fontFamily: familia, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export type VarianteTipo = keyof typeof tipo;

export const sombra = Platform.select({
  web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' },
  default: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
}) as object;

/** Objetivo táctil mínimo recomendado (Apple HIG / Material). */
export const TACTIL = 44;

export const CATEGORIAS = [
  { id: 'conciertos', nombre: 'Conciertos', icono: 'musical-notes' },
  { id: 'festivales', nombre: 'Festivales', icono: 'sparkles' },
  { id: 'clubbing', nombre: 'Clubbing', icono: 'disc' },
  { id: 'teatro', nombre: 'Teatro', icono: 'film' },
  { id: 'deportes', nombre: 'Deportes', icono: 'football' },
  { id: 'otros', nombre: 'Otros', icono: 'happy' },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]['id'];
