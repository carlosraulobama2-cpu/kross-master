import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, Pulsable, T, type NombreIcono } from '../components/base';
import { useTransferencias } from '../lib/consultas';
import { color, espacio } from '../theme';
import type { Pestanas, Rutas } from './tipos';

import { AccesoScreen } from '../screens/auth/Acceso';
import { BuscarScreen } from '../screens/explorar/Buscar';
import { ArtistaScreen } from '../screens/explorar/Artista';
import { ColaScreen } from '../screens/explorar/Cola';
import { EventoScreen } from '../screens/explorar/Evento';
import { RecintoScreen } from '../screens/explorar/Recinto';
import { ExplorarScreen } from '../screens/explorar/Explorar';
import { ConfirmacionScreen } from '../screens/compra/Confirmacion';
import { PagoScreen } from '../screens/compra/Pago';
import { EntradaScreen } from '../screens/entradas/Entrada';
import { EntradasScreen } from '../screens/entradas/Entradas';
import { TransferirScreen } from '../screens/entradas/Transferir';
import { EditarPerfilScreen } from '../screens/perfil/EditarPerfil';
import { HacerseOrganizadorScreen } from '../screens/perfil/HacerseOrganizador';
import { LegalScreen } from '../screens/perfil/Legal';
import { NotificacionesScreen } from '../screens/perfil/Notificaciones';
import { PedidoScreen, PedidosScreen } from '../screens/perfil/Pedidos';
import { PerfilScreen } from '../screens/perfil/Perfil';
import { EscanerScreen } from '../screens/organizador/Escaner';
import { EventoFormScreen } from '../screens/organizador/EventoForm';
import { GestionEventoScreen } from '../screens/organizador/GestionEvento';
import { OrganizadorScreen } from '../screens/organizador/Organizador';
import { PuertaScreen } from '../screens/organizador/Puerta';
import { InvitacionesScreen } from '../screens/organizador/Invitaciones';
import { TaquillaScreen } from '../screens/organizador/Taquilla';
import { TramoAvanzadoScreen } from '../screens/organizador/TramoAvanzado';
import { AyudaScreen } from '../screens/perfil/Ayuda';
import { traducir as tx } from '../lib/i18n';

const Stack = createNativeStackNavigator<Rutas>();
const Tabs = createBottomTabNavigator<Pestanas>();

const ICONOS: Record<keyof Pestanas, [NombreIcono, NombreIcono, string]> = {
  Explorar: ['compass-outline', 'compass', 'Explorar'],
  Buscar: ['search-outline', 'search', 'Buscar'],
  Entradas: ['ticket-outline', 'ticket', 'Entradas'],
  Perfil: ['person-circle-outline', 'person-circle', 'Perfil'],
};

/** Barra de pestañas propia: indicador en pastilla y punto de aviso. */
function BarraPestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { data: transferencias } = useTransferencias();
  const pendientes = transferencias?.recibidas.length ?? 0;
  return (
    <View style={[s.barra, { paddingBottom: Math.max(insets.bottom, espacio.s) }]}>
      {state.routes.map((ruta, i) => {
        const activa = state.index === i;
        const [inactivo, activo, nombre] = ICONOS[ruta.name as keyof Pestanas];
        const etiqueta = tx(nombre);
        return (
          <Pulsable
            key={ruta.key}
            style={s.pestana}
            exterior={{ flex: 1 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={etiqueta}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
              if (!activa && !e.defaultPrevented) navigation.navigate(ruta.name);
            }}
          >
            <View style={[s.pastilla, activa && { backgroundColor: color.acentoSuave }]}>
              <Icono n={activa ? activo : inactivo} tam={23} c={activa ? color.acento : color.texto3} />
              {ruta.name === 'Entradas' && pendientes > 0 && <View style={s.punto} />}
            </View>
            <T v="mini" c={activa ? 'texto' : 'texto3'} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
              {etiqueta}
            </T>
          </Pulsable>
        );
      })}
    </View>
  );
}

function PestanasPrincipales() {
  return (
    <Tabs.Navigator tabBar={(p) => <BarraPestanas {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.fondo } }}>
      <Tabs.Screen name="Explorar" component={ExplorarScreen} />
      <Tabs.Screen name="Buscar" component={BuscarScreen} />
      <Tabs.Screen name="Entradas" component={EntradasScreen} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  );
}

const tema = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: color.fondo, card: color.fondo, primary: color.acento, text: color.texto, border: color.borde },
};

/** Enlaces profundos: kroosmaster://evento/<id>, https://kroosmaster.app/evento/<id> */
const enlaces: LinkingOptions<Rutas> = {
  prefixes: ['kroosmaster://', 'https://kroosmaster.app'],
  config: {
    screens: {
      Pestanas: { screens: { Explorar: '', Buscar: 'buscar', Entradas: 'entradas', Perfil: 'perfil' } },
      Evento: 'evento/:id',
      Artista: 'artista/:id',
      Recinto: 'recinto/:id',
      Entrada: 'entrada/:id',
    },
  },
};

export function Navegacion() {
  return (
    <NavigationContainer theme={tema} linking={enlaces}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo }, animation: 'slide_from_right' }}>
        <Stack.Screen name="Pestanas" component={PestanasPrincipales} />
        <Stack.Screen name="Evento" component={EventoScreen} />
        <Stack.Screen name="Artista" component={ArtistaScreen} />
        <Stack.Screen name="Recinto" component={RecintoScreen} />
        <Stack.Screen name="Pedidos" component={PedidosScreen} />
        <Stack.Screen name="Pedido" component={PedidoScreen} />
        <Stack.Screen name="Cola" component={ColaScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Pago" component={PagoScreen} />
        <Stack.Screen name="Confirmacion" component={ConfirmacionScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="Entrada" component={EntradaScreen} />
        <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfilScreen} />
        <Stack.Screen name="Organizador" component={OrganizadorScreen} />
        <Stack.Screen name="GestionEvento" component={GestionEventoScreen} />
        <Stack.Screen name="Puerta" component={PuertaScreen} />
        <Stack.Screen name="Escaner" component={EscanerScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Taquilla" component={TaquillaScreen} />
        <Stack.Screen name="Invitaciones" component={InvitacionesScreen} />
        <Stack.Screen name="TramoAvanzado" component={TramoAvanzadoScreen} />
        <Stack.Screen name="Ayuda" component={AyudaScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <Stack.Screen name="Acceso" component={AccesoScreen} />
          <Stack.Screen name="Transferir" component={TransferirScreen} />
          <Stack.Screen name="HacerseOrganizador" component={HacerseOrganizadorScreen} />
          <Stack.Screen name="EventoForm" component={EventoFormScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  barra: { flexDirection: 'row', paddingTop: espacio.s, backgroundColor: color.fondo, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borde },
  pestana: { flex: 1, alignItems: 'center', gap: 3, minHeight: 52 },
  pastilla: { width: 60, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  punto: { position: 'absolute', top: 4, right: 16, width: 9, height: 9, borderRadius: 5, backgroundColor: color.peligro, borderWidth: 2, borderColor: color.fondo },
});
