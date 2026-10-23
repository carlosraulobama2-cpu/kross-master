import { useState } from 'react';
import { View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, T, type NombreIcono } from '../../components/base';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Usuario } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

const VENTAJAS: [NombreIcono, string, string][] = [
  ['flash', 'Publica en minutos', 'Crea tu evento con varios tipos de entrada desde el móvil.'],
  ['card', 'Cobra al momento', 'Conecta Stripe y recibe el dinero de cada venta directamente.'],
  ['qr-code', 'Puerta sin colas', 'Escanea con el móvil; los QR cambian cada 30 s y no se pueden copiar.'],
  ['stats-chart', 'Ventas en directo', 'Mira cuántas entradas llevas vendidas y quién ha entrado.'],
];

export function HacerseOrganizadorScreen({ navigation }: PropsPantalla<'HacerseOrganizador'>) {
  const { usuario, setUsuario } = useAuth();
  const avisar = useAviso();
  const [nombre, setNombre] = useState(usuario?.nombre_artistico ?? '');
  const [telefono, setTelefono] = useState(usuario?.telefono ?? '');
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setEnviando(true);
    try {
      const r = await api<{ usuario: Usuario }>('/me/organizador', { method: 'POST', body: { nombre_artistico: nombre.trim(), telefono: telefono.trim() } });
      setUsuario(r.usuario);
      avisar('¡Listo! Ya puedes crear tu primer evento', 'exito');
      navigation.replace('EventoForm');
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla
      cabecera={<Cabecera cerrar />}
      pie={
        <Boton onPress={() => void enviar()} cargando={enviando} deshabilitado={nombre.trim().length < 2 || telefono.trim().length < 6}>
          Empezar a organizar
        </Boton>
      }
    >
      <T v="display">Vende tus entradas con Kroos Master</T>
      <View style={{ gap: espacio.l, marginVertical: espacio.xxl }}>
        {VENTAJAS.map(([icono, titulo, texto]) => (
          <Fila key={titulo} gap={espacio.l} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 44, height: 44, borderRadius: radio.m, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' }}>
              <Icono n={icono} c={color.acento} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">{titulo}</T>
              <T v="nota" c="texto2">
                {texto}
              </T>
            </View>
          </Fila>
        ))}
      </View>
      <View style={{ gap: espacio.l }}>
        <Campo etiqueta="Nombre público" value={nombre} onChangeText={setNombre} icono="megaphone-outline" placeholder="Sala, promotora o artista" ayuda="Es el nombre que verán los asistentes" />
        <Campo etiqueta="Teléfono de contacto" value={telefono} onChangeText={setTelefono} icono="call-outline" keyboardType="phone-pad" />
      </View>
    </Pantalla>
  );
}
