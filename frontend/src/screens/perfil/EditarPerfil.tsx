import { useState } from 'react';
import { View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton } from '../../components/base';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Usuario } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { espacio } from '../../theme';

export function EditarPerfilScreen({ navigation }: PropsPantalla<'EditarPerfil'>) {
  const { usuario, setUsuario } = useAuth();
  const avisar = useAviso();
  const [datos, setDatos] = useState({
    nombre: usuario?.nombre ?? '',
    telefono: usuario?.telefono ?? '',
    ciudad: usuario?.ciudad ?? '',
    bio: usuario?.bio ?? '',
  });
  const [guardando, setGuardando] = useState(false);
  const cambiar = (k: keyof typeof datos) => (v: string) => setDatos((d) => ({ ...d, [k]: v }));

  async function guardar() {
    setGuardando(true);
    try {
      const r = await api<{ usuario: Usuario }>('/me', {
        method: 'PATCH',
        body: { nombre: datos.nombre.trim(), telefono: datos.telefono.trim() || null, ciudad: datos.ciudad.trim() || null, bio: datos.bio.trim() || null },
      });
      setUsuario(r.usuario);
      avisar('Perfil actualizado', 'exito');
      navigation.goBack();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Pantalla
      cabecera={<Cabecera titulo="Datos personales" />}
      pie={
        <Boton onPress={() => void guardar()} cargando={guardando} deshabilitado={datos.nombre.trim().length < 2}>
          Guardar cambios
        </Boton>
      }
    >
      <View style={{ gap: espacio.l }}>
        <Campo etiqueta="Email" value={usuario?.email} editable={false} icono="mail-outline" ayuda="El email no se puede cambiar desde la app" />
        <Campo etiqueta="Nombre" value={datos.nombre} onChangeText={cambiar('nombre')} icono="person-outline" />
        <Campo etiqueta="Teléfono" value={datos.telefono} onChangeText={cambiar('telefono')} icono="call-outline" keyboardType="phone-pad" placeholder="Opcional" />
        <Campo etiqueta="Ciudad" value={datos.ciudad} onChangeText={cambiar('ciudad')} icono="location-outline" placeholder="Para recomendarte eventos cerca" />
        <Campo etiqueta="Sobre ti" value={datos.bio} onChangeText={cambiar('bio')} multiline maxLength={500} placeholder="Opcional" />
      </View>
    </Pantalla>
  );
}
