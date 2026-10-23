import Constants from 'expo-constants';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, Insignia, Pulsable, T, type NombreIcono } from '../../components/base';
import { IDIOMAS, useT } from '../../lib/i18n';
import { TarjetaEvento } from '../../components/evento';
import { Pantalla, TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { confirmar } from '../../lib/confirmar';
import { useAuth } from '../../lib/auth';
import { useEventosPuerta, useFavoritos, useNotificaciones, useSiguiendo } from '../../lib/consultas';
import type { PropsPestana } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

function Opcion({ icono, texto, detalle, onPress, peligro, contador }: { icono: NombreIcono; texto: string; detalle?: string; onPress: () => void; peligro?: boolean; contador?: number }) {
  return (
    <Pulsable onPress={onPress} style={s.opcion} escala={0.99}>
      <View style={[s.opcionIcono, peligro && { backgroundColor: color.peligroSuave }]}>
        <Icono n={icono} tam={19} c={peligro ? color.peligro : color.texto} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="cuerpoFuerte" c={peligro ? 'peligro' : 'texto'}>
          {texto}
        </T>
        {detalle && (
          <T v="nota" c="texto3">
            {detalle}
          </T>
        )}
      </View>
      {contador ? (
        <View style={s.contador}>
          <T v="mini" c="acentoTexto" style={{ letterSpacing: 0 }}>
            {contador}
          </T>
        </View>
      ) : null}
      {!peligro && <Icono n="chevron-forward" tam={18} c={color.texto3} />}
    </Pulsable>
  );
}

const Grupo = ({ children }: { children: React.ReactNode }) => <View style={s.grupo}>{children}</View>;

export function PerfilScreen({ navigation }: PropsPestana<'Perfil'>) {
  const { usuario, salir } = useAuth();
  const { data: favoritos } = useFavoritos();
  const { data: notificaciones } = useNotificaciones();
  const { data: puerta } = useEventosPuerta();
  const { data: siguiendo } = useSiguiendo();
  const avisar = useAviso();
  const version = Constants.expoConfig?.version ?? '';
  const { idioma, cambiar: cambiarIdioma } = useT();

  const legales = (
    <Grupo>
      <Opcion icono="document-text-outline" texto="Términos y condiciones" onPress={() => navigation.navigate('Legal', { doc: 'terminos' })} />
      <Opcion icono="lock-closed-outline" texto="Privacidad" onPress={() => navigation.navigate('Legal', { doc: 'privacidad' })} />
      <Opcion icono="help-buoy-outline" texto="Centro de ayuda" detalle="Preguntas frecuentes y contacto" onPress={() => navigation.navigate('Ayuda')} />
    </Grupo>
  );

  const selectorIdioma = (
    <>
      <TituloSeccion titulo="Idioma" />
      <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
        {IDIOMAS.map((i) => (
          <Chip key={i.id} texto={i.nombre} activo={idioma === i.id} onPress={() => cambiarIdioma(i.id)} />
        ))}
      </Fila>
    </>
  );

  if (!usuario) {
    return (
      <Pantalla>
        <T v="titulo">Perfil</T>
        <View style={s.invitado}>
          <View style={s.avatarGrande}>
            <Icono n="person" tam={36} c={color.texto2} />
          </View>
          <T v="subtitulo" centro>
            Entra en Kroos Master
          </T>
          <T c="texto2" centro>
            Guarda favoritos, compra en un toque y lleva tus entradas siempre contigo.
          </T>
          <View style={{ alignSelf: 'stretch', gap: espacio.s, marginTop: espacio.s }}>
            <Boton onPress={() => navigation.navigate('Acceso', { modo: 'registro' })}>Crear cuenta</Boton>
            <Boton v="secundario" onPress={() => navigation.navigate('Acceso', { modo: 'entrar' })}>
              Ya tengo cuenta
            </Boton>
          </View>
        </View>
        {legales}
        {selectorIdioma}
      </Pantalla>
    );
  }

  const organizador = usuario.rol === 'organizador' || usuario.rol === 'admin';
  const sinLeer = notificaciones?.filter((n) => !n.leida).length ?? 0;
  const iniciales = (usuario.nombre || usuario.email).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Pantalla>
      <Pulsable onPress={() => navigation.navigate('EditarPerfil')} style={s.cabecera} escala={0.99} accessibilityLabel="Editar perfil">
        <View style={s.avatar}>
          <T v="subtitulo" c="acentoTexto">
            {iniciales}
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="subtitulo" numberOfLines={1}>
            {usuario.nombre || 'Tu perfil'}
          </T>
          <T v="nota" c="texto2" numberOfLines={1}>
            {usuario.email}
          </T>
          {organizador && (
            <View style={{ marginTop: 4 }}>
              <Insignia texto={usuario.rol === 'admin' ? 'Admin' : usuario.nombre_artistico || 'Organizador'} tono="acento" icono="star" />
            </View>
          )}
        </View>
        <Icono n="create-outline" c={color.texto3} />
      </Pulsable>

      {!organizador && (
        <Pulsable onPress={() => navigation.navigate('HacerseOrganizador')} style={s.promo} escala={0.98}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="cabecera">¿Organizas eventos?</T>
            <T v="nota" c="texto2">
              Vende entradas con QR seguro, cobra al momento y controla el acceso desde el móvil.
            </T>
          </View>
          <View style={s.promoIcono}>
            <Icono n="arrow-forward" c={color.acentoTexto} />
          </View>
        </Pulsable>
      )}

      {organizador && (
        <>
          <TituloSeccion titulo="Organizador" />
          <Grupo>
            <Opcion icono="stats-chart-outline" texto="Mis eventos y ventas" onPress={() => navigation.navigate('Organizador')} />
            <Opcion icono="add-circle-outline" texto="Crear evento" onPress={() => navigation.navigate('EventoForm')} />
          </Grupo>
        </>
      )}

      {(organizador || (puerta?.length ?? 0) > 0) && (
        <>
          <TituloSeccion titulo="Puerta" />
          <Grupo>
            <Opcion icono="scan-outline" texto="Escanear entradas" detalle={puerta?.length ? `${puerta.length} evento${puerta.length === 1 ? '' : 's'} disponibles` : undefined} onPress={() => navigation.navigate('Puerta')} />
          </Grupo>
        </>
      )}

      {(favoritos?.length ?? 0) > 0 && (
        <>
          <TituloSeccion titulo="Guardados" />
          <FlatList
            horizontal
            data={favoritos}
            keyExtractor={(e) => e.id}
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -espacio.xl }}
            contentContainerStyle={{ paddingHorizontal: espacio.xl, gap: espacio.l }}
            renderItem={({ item }) => <TarjetaEvento evento={item} ancho={180} onPress={() => navigation.navigate('Evento', { id: item.id })} />}
          />
        </>
      )}

      {((siguiendo?.artistas.length ?? 0) > 0 || (siguiendo?.recintos.length ?? 0) > 0) && (
        <>
          <TituloSeccion titulo="Siguiendo" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -espacio.xl }} contentContainerStyle={{ paddingHorizontal: espacio.xl, gap: espacio.s }}>
            {siguiendo?.artistas.map((a) => (
              <Pulsable key={a.id} onPress={() => navigation.navigate('Artista', { id: a.id })} style={s.seguido}>
                <View style={s.seguidoAvatar}>
                  <T v="cuerpoFuerte" c="acentoTexto">
                    {a.nombre[0]}
                  </T>
                </View>
                <T v="nota" numberOfLines={1} style={{ fontWeight: '700' }}>
                  {a.nombre}
                </T>
              </Pulsable>
            ))}
            {siguiendo?.recintos.map((r) => (
              <Pulsable key={r.id} onPress={() => navigation.navigate('Recinto', { id: r.id })} style={s.seguido}>
                <View style={[s.seguidoAvatar, { backgroundColor: color.superficie3 }]}>
                  <Icono n="business" tam={18} c={color.texto} />
                </View>
                <T v="nota" numberOfLines={1} style={{ fontWeight: '700' }}>
                  {r.nombre}
                </T>
              </Pulsable>
            ))}
          </ScrollView>
        </>
      )}

      <TituloSeccion titulo="Cuenta" />
      <Grupo>
        <Opcion icono="receipt-outline" texto="Mis pedidos" detalle="Compras y recibos" onPress={() => navigation.navigate('Pedidos')} />
        <Opcion icono="notifications-outline" texto="Notificaciones" contador={sinLeer} onPress={() => navigation.navigate('Notificaciones')} />
        <Opcion icono="person-outline" texto="Datos personales" onPress={() => navigation.navigate('EditarPerfil')} />
      </Grupo>

      <TituloSeccion titulo="Ayuda" />
      {legales}
      {selectorIdioma}

      <View style={{ marginTop: espacio.xxl, gap: espacio.s }}>
        <Grupo>
          <Opcion icono="log-out-outline" texto="Cerrar sesión" peligro onPress={() => void salir()} />
        </Grupo>
        <Pulsable
          style={{ alignSelf: 'center', padding: espacio.m }}
          onPress={async () => {
            const ok = await confirmar('¿Eliminar tu cuenta?', 'Perderás el acceso a tus entradas. Esta acción no se puede deshacer.', 'Eliminar');
            if (!ok) return;
            try {
              await api('/me', { method: 'DELETE' });
              await salir();
              avisar('Tu cuenta se ha eliminado', 'info');
            } catch (e) {
              avisar(mensajeDe(e), 'error');
            }
          }}
        >
          <T v="nota" c="texto3">
            Eliminar cuenta
          </T>
        </Pulsable>
        <T v="nota" c="texto3" centro>
          Kroos Master {version}
        </T>
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.l, padding: espacio.l, borderRadius: radio.xl, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  avatarGrande: { width: 84, height: 84, borderRadius: 42, backgroundColor: color.superficie2, alignItems: 'center', justifyContent: 'center', marginBottom: espacio.s },
  invitado: { alignItems: 'center', gap: espacio.s, paddingVertical: espacio.xxl },
  promo: { flexDirection: 'row', alignItems: 'center', gap: espacio.l, marginTop: espacio.l, padding: espacio.l, borderRadius: radio.xl, backgroundColor: color.acentoSuave, borderWidth: 1, borderColor: 'rgba(0,255,135,0.3)' },
  promoIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  grupo: { borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, overflow: 'hidden' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: 60, paddingHorizontal: espacio.l, paddingVertical: espacio.s },
  opcionIcono: { width: 36, height: 36, borderRadius: radio.m, backgroundColor: color.superficie2, alignItems: 'center', justifyContent: 'center' },
  seguido: { width: 84, alignItems: 'center', gap: 6 },
  seguidoAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  contador: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
});
