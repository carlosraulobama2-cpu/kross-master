import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type Pestanas = {
  Explorar: undefined;
  Buscar: { categoria?: string } | undefined;
  Entradas: undefined;
  Perfil: undefined;
};

export type Rutas = {
  Pestanas: NavigatorScreenParams<Pestanas>;
  Evento: { id: string };
  Pago: { pedidoId: string; clientSecret: string | null };
  Confirmacion: { pedidoId: string };
  Entrada: { id: string };
  Transferir: { entradaId: string; titulo: string };
  Acceso: { modo?: 'entrar' | 'registro' } | undefined;
  Notificaciones: undefined;
  EditarPerfil: undefined;
  HacerseOrganizador: undefined;
  Organizador: undefined;
  EventoForm: { id?: string } | undefined;
  GestionEvento: { id: string };
  Puerta: undefined;
  Escaner: { eventoId: string; titulo: string };
  Legal: { doc: 'terminos' | 'privacidad' | 'organizador' };
};

export type PropsPantalla<R extends keyof Rutas> = NativeStackScreenProps<Rutas, R>;
export type PropsPestana<P extends keyof Pestanas> = CompositeScreenProps<BottomTabScreenProps<Pestanas, P>, NativeStackScreenProps<Rutas>>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends Rutas {}
  }
}
