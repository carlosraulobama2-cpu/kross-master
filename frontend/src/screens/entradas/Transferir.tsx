import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, T } from '../../components/base';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api, ErrorApi, mensajeDe } from '../../lib/api';
import { invalidarYo } from '../../lib/consultas';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio } from '../../theme';
import { traducir as tx } from '../../lib/i18n';

export function TransferirScreen({ navigation, route }: PropsPantalla<'Transferir'>) {
  const { entradaId, titulo } = route.params;
  const qc = useQueryClient();
  const avisar = useAviso();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const valido = /^\S+@\S+\.\S+$/.test(email.trim());

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      await api(`/entradas/${entradaId}/transferir`, { method: 'POST', body: { email: email.trim() } });
      await invalidarYo(qc);
      avisar(tx('Entrada enviada. Le avisaremos para que la acepte'), 'exito');
      navigation.goBack();
    } catch (e) {
      if (e instanceof ErrorApi && e.status < 500) setError(e.message);
      else avisar(mensajeDe(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla
      cabecera={<Cabecera titulo={tx('Enviar entrada')} cerrar />}
      pie={
        <Boton onPress={() => void enviar()} deshabilitado={!valido} cargando={enviando} icono="paper-plane">
          {tx('Enviar entrada')}
        </Boton>
      }
    >
      <View style={{ gap: espacio.xl }}>
        <View style={{ gap: espacio.s }}>
          <T v="titulo">{tx('¿A quién se la envías?')}</T>
          <T c="texto2">
            Tu entrada para <T v="cuerpoFuerte">{titulo}</T> pasará a su cuenta en cuanto la acepte.
          </T>
        </View>
        <Campo
          etiqueta={tx('Email de su cuenta en Kroos Master')}
          icono="mail-outline"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setError(null);
          }}
          error={error}
          placeholder={tx('amiga@email.com')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={() => valido && void enviar()}
        />
        <Fila gap={espacio.m} style={{ alignItems: 'flex-start' }}>
          <Icono n="shield-checkmark-outline" c={color.acento} />
          <T v="nota" c="texto2" style={{ flex: 1 }}>
            {tx('Al aceptarla se genera un QR nuevo y el tuyo deja de funcionar. Puedes cancelar el envío mientras esté pendiente.')}
          </T>
        </Fila>
      </View>
    </Pantalla>
  );
}
