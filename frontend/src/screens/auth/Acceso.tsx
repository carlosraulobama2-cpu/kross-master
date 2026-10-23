import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Pulsable, T } from '../../components/base';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api, ErrorApi, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

type Errores = Partial<Record<'nombre' | 'email' | 'password' | 'general', string>>;

export function AccesoScreen({ navigation, route }: PropsPantalla<'Acceso'>) {
  const { entrar, registrarse } = useAuth();
  const avisar = useAviso();
  const [modo, setModo] = useState<'entrar' | 'registro'>(route.params?.modo ?? 'entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const registro = modo === 'registro';

  function validar(): Errores {
    const e: Errores = {};
    if (registro && nombre.trim().length < 2) e.nombre = 'Escribe tu nombre';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Revisa el email';
    if (registro ? password.length < 8 : !password) e.password = registro ? 'Mínimo 8 caracteres' : 'Escribe tu contraseña';
    return e;
  }

  async function enviar() {
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      if (registro) {
        const r = await registrarse({ email: email.trim(), password, nombre: nombre.trim() });
        if (r.requiereConfirmacion) {
          avisar('Te hemos enviado un email para confirmar tu cuenta', 'exito');
          setModo('entrar');
          return;
        }
        avisar(`¡Bienvenido, ${nombre.trim().split(' ')[0]}!`, 'exito');
      } else {
        await entrar(email.trim(), password);
      }
      navigation.goBack();
    } catch (err) {
      if (err instanceof ErrorApi && err.status < 500) setErrores({ general: err.message });
      else avisar(mensajeDe(err), 'error');
    } finally {
      setEnviando(false);
    }
  }

  async function recuperar() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrores({ email: 'Escribe tu email para recuperar la contraseña' });
      return;
    }
    await api('/auth/recuperar', { method: 'POST', body: { email: email.trim() } }).catch(() => undefined);
    avisar('Si existe una cuenta, recibirás un email para cambiar la contraseña', 'info');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla cabecera={<Cabecera cerrar />}>
        <View style={s.logo}>
          <T v="titulo" c="acentoTexto">
            K
          </T>
        </View>
        <T v="display" style={{ marginTop: espacio.xl }}>
          {registro ? 'Crea tu cuenta' : 'Hola de nuevo'}
        </T>
        <T c="texto2" style={{ marginTop: espacio.s }}>
          {registro ? 'Compra entradas en segundos y llévalas siempre contigo.' : 'Entra para ver tus entradas y comprar en un toque.'}
        </T>

        <View style={s.selector}>
          {(['entrar', 'registro'] as const).map((m) => (
            <Pulsable
              key={m}
              onPress={() => {
                setModo(m);
                setErrores({});
              }}
              style={[s.opcion, modo === m && s.opcionActiva]}
              accessibilityState={{ selected: modo === m }}
              escala={0.98}
            >
              <T v="cuerpoFuerte" c={modo === m ? 'texto' : 'texto3'}>
                {m === 'entrar' ? 'Entrar' : 'Registrarme'}
              </T>
            </Pulsable>
          ))}
        </View>

        <View style={{ gap: espacio.l }}>
          {errores.general && (
            <View style={s.error} accessibilityRole="alert">
              <T v="cuerpoFuerte" c="peligro">
                {errores.general}
              </T>
            </View>
          )}
          {registro && (
            <Campo etiqueta="Nombre" icono="person-outline" value={nombre} onChangeText={setNombre} error={errores.nombre} placeholder="Cómo te llamas" autoComplete="name" textContentType="name" />
          )}
          <Campo
            etiqueta="Email"
            icono="mail-outline"
            value={email}
            onChangeText={setEmail}
            error={errores.email}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Campo
            etiqueta="Contraseña"
            icono="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            error={errores.password}
            placeholder={registro ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
            secureTextEntry
            autoComplete={registro ? 'new-password' : 'current-password'}
            textContentType={registro ? 'newPassword' : 'password'}
            onSubmitEditing={() => void enviar()}
          />
          {!registro && (
            <Pulsable onPress={() => void recuperar()} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
              <T v="nota" c="acento" style={{ fontWeight: '700' }}>
                ¿Has olvidado la contraseña?
              </T>
            </Pulsable>
          )}
          <Boton onPress={() => void enviar()} cargando={enviando} style={{ marginTop: espacio.s }}>
            {registro ? 'Crear cuenta' : 'Entrar'}
          </Boton>
          {registro && (
            <Fila gap={4} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              <T v="nota" c="texto3">
                Al registrarte aceptas los
              </T>
              <Pulsable onPress={() => navigation.navigate('Legal', { doc: 'terminos' })}>
                <T v="nota" c="texto2" style={{ textDecorationLine: 'underline' }}>
                  términos
                </T>
              </Pulsable>
              <T v="nota" c="texto3">
                y la
              </T>
              <Pulsable onPress={() => navigation.navigate('Legal', { doc: 'privacidad' })}>
                <T v="nota" c="texto2" style={{ textDecorationLine: 'underline' }}>
                  privacidad
                </T>
              </Pulsable>
            </Fila>
          )}
        </View>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  logo: { width: 56, height: 56, borderRadius: 18, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  selector: { flexDirection: 'row', padding: 4, marginVertical: espacio.xxl, borderRadius: radio.l, backgroundColor: color.superficie },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radio.m },
  opcionActiva: { backgroundColor: color.superficie3 },
  error: { padding: espacio.l, borderRadius: radio.m, backgroundColor: color.peligroSuave },
});
