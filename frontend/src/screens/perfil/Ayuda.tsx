import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { LayoutAnimation, Linking, StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, Insignia, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { haceCuanto } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import { useT } from '../../lib/i18n';
import type { ConsultaSoporte, Faq } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Centro de ayuda: preguntas frecuentes, contacto y respuestas del soporte. */
export function AyudaScreen(_: PropsPantalla<'Ayuda'>) {
  const { t } = useT();
  const { usuario } = useAuth();
  const avisar = useAviso();
  const ayuda = useQuery({ queryKey: ['ayuda'], queryFn: () => api<{ faqs: Faq[]; email: string | null }>('/ayuda'), staleTime: 5 * 60_000 });
  const mias = useQuery({
    queryKey: ['yo', usuario?.id, 'consultas'],
    queryFn: () => api<{ consultas: ConsultaSoporte[] }>('/me/consultas').then((r) => r.consultas),
    enabled: Boolean(usuario),
  });
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  const faqs = ayuda.data?.faqs ?? [];
  const categorias = useMemo(() => [...new Set(faqs.map((f) => f.categoria))], [faqs]);
  const visibles = faqs.filter(
    (f) => (!categoria || f.categoria === categoria) && (!busqueda.trim() || sinTildes(`${f.pregunta} ${f.respuesta}`).includes(sinTildes(busqueda.trim()))),
  );
  const valido = asunto.trim().length >= 3 && mensaje.trim().length >= 10 && (Boolean(usuario) || /^\S+@\S+\.\S+$/.test(email.trim()));

  async function enviar() {
    setEnviando(true);
    try {
      await api('/ayuda/contacto', { method: 'POST', body: { asunto: asunto.trim(), mensaje: mensaje.trim(), email: usuario ? undefined : email.trim() } });
      haptica.exito();
      avisar(t('Mensaje enviado. Te responderemos lo antes posible'), 'exito');
      setAsunto('');
      setMensaje('');
      void mias.refetch();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla cabecera={<Cabecera titulo={t('Ayuda')} />}>
      <T v="titulo">{t('¿En qué te ayudamos?')}</T>
      <View style={{ marginTop: espacio.l }}>
        <Campo etiqueta={t('Buscar en la ayuda')} value={busqueda} onChangeText={setBusqueda} placeholder={t('Reembolso, transferir, butaca…')} icono="search" />
      </View>
      {categorias.length > 1 && (
        <Fila gap={espacio.s} style={{ flexWrap: 'wrap', marginTop: espacio.m }}>
          <Chip texto={t('Todo')} activo={!categoria} onPress={() => setCategoria(null)} />
          {categorias.map((c) => (
            <Chip key={c} texto={t(c)} activo={categoria === c} onPress={() => setCategoria(c)} />
          ))}
        </Fila>
      )}

      <TituloSeccion titulo={t('Preguntas frecuentes')} />
      {ayuda.error ? (
        <ErrorEstado error={ayuda.error} reintentar={() => void ayuda.refetch()} />
      ) : ayuda.isPending ? (
        <View style={{ gap: espacio.s }}>
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} alto={56} r={radio.l} />
          ))}
        </View>
      ) : visibles.length === 0 ? (
        <Vacio icono="search-outline" titulo={t('Sin resultados')} texto={t('Prueba con otras palabras o escríbenos abajo.')} />
      ) : (
        <View style={s.grupo}>
          {visibles.map((f, i) => {
            const abiertaEsta = abierta === f.id;
            return (
              <View key={f.id} style={i > 0 && s.separador}>
                <Pulsable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setAbierta(abiertaEsta ? null : f.id);
                  }}
                  style={s.pregunta}
                  escala={0.99}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: abiertaEsta }}
                >
                  <T v="cuerpoFuerte" style={{ flex: 1 }}>
                    {f.pregunta}
                  </T>
                  <Icono n={abiertaEsta ? 'chevron-up' : 'chevron-down'} tam={18} c={color.texto3} />
                </Pulsable>
                {abiertaEsta && (
                  <T c="texto2" style={{ paddingHorizontal: espacio.l, paddingBottom: espacio.l }}>
                    {f.respuesta}
                  </T>
                )}
              </View>
            );
          })}
        </View>
      )}

      {usuario && (mias.data?.length ?? 0) > 0 && (
        <>
          <TituloSeccion titulo={t('Tus consultas')} />
          <View style={{ gap: espacio.s }}>
            {mias.data!.map((c) => (
              <View key={c.id} style={[s.tarjeta, { gap: espacio.s }]}>
                <Fila gap={espacio.s}>
                  <T v="cuerpoFuerte" style={{ flex: 1 }} numberOfLines={1}>
                    {c.asunto}
                  </T>
                  <Insignia texto={t(c.estado === 'abierta' ? 'Pendiente' : c.estado === 'respondida' ? 'Respondida' : 'Cerrada')} tono={c.estado === 'respondida' ? 'acento' : c.estado === 'abierta' ? 'aviso' : 'neutro'} />
                </Fila>
                <T v="nota" c="texto3">
                  {haceCuanto(c.creado_en)}
                </T>
                {c.respuesta && (
                  <View style={s.respuesta}>
                    <T v="nota" c="acento" style={{ fontWeight: '700' }}>
                      {t('Respuesta del equipo')}
                    </T>
                    <T c="texto">{c.respuesta}</T>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <TituloSeccion titulo={t('¿No encuentras la respuesta?')} />
      <View style={[s.tarjeta, { gap: espacio.m }]}>
        {!usuario && <Campo etiqueta={t('Tu email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icono="mail-outline" />}
        <Campo etiqueta={t('Asunto')} value={asunto} onChangeText={setAsunto} placeholder={t('Ej.: no me llega la entrada')} />
        <Campo etiqueta={t('Mensaje')} value={mensaje} onChangeText={setMensaje} multiline placeholder={t('Cuéntanos qué pasa. Si es sobre un pedido, indica el evento.')} />
        <Boton icono="send" deshabilitado={!valido} cargando={enviando} onPress={() => void enviar()}>
          {t('Enviar mensaje')}
        </Boton>
        {ayuda.data?.email && (
          <Pulsable onPress={() => void Linking.openURL(`mailto:${ayuda.data!.email}`)} style={{ alignSelf: 'center' }}>
            <T v="nota" c="texto2">
              {t('O escríbenos a')} <T v="nota" c="acento">{ayuda.data.email}</T>
            </T>
          </Pulsable>
        )}
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  grupo: { borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, overflow: 'hidden' },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borde },
  pregunta: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: 56, paddingHorizontal: espacio.l, paddingVertical: espacio.m },
  tarjeta: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  respuesta: { gap: 4, padding: espacio.m, borderRadius: radio.m, backgroundColor: color.acentoSuave },
});
