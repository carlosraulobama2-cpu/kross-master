import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, BotonIcono, Chip, Fila, Icono, Pulsable, Separador, T } from '../../components/base';
import { Esqueleto } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { SelectorFecha } from '../../components/SelectorFecha';
import { api, mensajeDe } from '../../lib/api';
import { invalidarYo, useEventoGestion } from '../../lib/consultas';
import { fechaLarga, hora, precio } from '../../lib/formato';
import type { EventoGestion } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio, type Categoria } from '../../theme';

interface TramoForm {
  nombre: string;
  precio: string;
  cantidad: string;
  max: string;
  codigo: string;
  accesible: boolean;
}

const DURACIONES = [1, 2, 3, 4, 6, 12, 24];
const PASOS = ['El evento', 'Cuándo y dónde', 'Entradas', 'Revisar'];

const euros = (txt: string) => Math.round(Number(txt.replace(',', '.')) * 100);
const entero = (txt: string) => Number.parseInt(txt, 10);

export function EventoFormScreen({ navigation, route }: PropsPantalla<'EventoForm'>) {
  const id = route.params?.id;
  const editando = Boolean(id);
  const { data: existente } = useEventoGestion(id ?? '');
  const qc = useQueryClient();
  const avisar = useAviso();

  const [paso, setPaso] = useState(0);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('conciertos');
  const [imagen, setImagen] = useState('');
  const [recinto, setRecinto] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [inicia, setInicia] = useState<Date | null>(null);
  const [duracion, setDuracion] = useState(3);
  const [tramos, setTramos] = useState<TramoForm[]>([{ nombre: 'General', precio: '', cantidad: '', max: '6', codigo: '', accesible: false }]);
  const [artistas, setArtistas] = useState<string[]>([]);
  const [nuevoArtista, setNuevoArtista] = useState('');
  const [puertas, setPuertas] = useState<Date | null>(null);
  const [maxPorUsuario, setMaxPorUsuario] = useState('');
  const [verInfo, setVerInfo] = useState(false);
  const [info, setInfo] = useState({ como_llegar: '', parking: '', accesibilidad: '', objetos_prohibidos: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<'borrador' | 'publicar' | null>(null);

  useEffect(() => {
    if (!existente) return;
    setTitulo(existente.titulo);
    setDescripcion(existente.descripcion);
    setCategoria(existente.categoria);
    setImagen(existente.imagen_url ?? '');
    setRecinto(existente.recinto);
    setDireccion(existente.direccion ?? '');
    setCiudad(existente.ciudad);
    setInicia(new Date(existente.inicia_en));
    setArtistas(existente.artistas.map((a) => a.nombre));
    setPuertas(existente.puertas_abren_en ? new Date(existente.puertas_abren_en) : null);
    setMaxPorUsuario(existente.max_por_usuario ? String(existente.max_por_usuario) : '');
    if (existente.recinto_info) {
      const r = existente.recinto_info;
      setInfo({ como_llegar: r.como_llegar ?? '', parking: r.parking ?? '', accesibilidad: r.accesibilidad ?? '', objetos_prohibidos: r.objetos_prohibidos ?? '' });
    }
    if (existente.termina_en) setDuracion(Math.max(1, Math.round((new Date(existente.termina_en).getTime() - new Date(existente.inicia_en).getTime()) / 3_600_000)));
  }, [existente]);

  const ultimoPaso = editando ? 1 : 3;

  function anadirArtista() {
    const n = nuevoArtista.trim();
    if (n.length >= 2 && !artistas.some((a) => a.toLowerCase() === n.toLowerCase())) setArtistas((l) => [...l, n]);
    setNuevoArtista('');
  }

  function validar(p: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (p === 0) {
      if (titulo.trim().length < 3) e.titulo = 'Ponle un título (mínimo 3 letras)';
      if (imagen && !/^https?:\/\/\S+$/.test(imagen.trim())) e.imagen = 'Debe ser una URL que empiece por http';
    }
    if (p === 1) {
      if (!inicia) e.inicia = 'Elige la fecha';
      else if (inicia.getTime() < Date.now()) e.inicia = 'La fecha debe ser futura';
      if (recinto.trim().length < 2) e.recinto = 'Indica el recinto';
      if (puertas && inicia && puertas.getTime() > inicia.getTime()) e.puertas = 'Las puertas deben abrir antes de que empiece';
      if (ciudad.trim().length < 2) e.ciudad = 'Indica la ciudad';
    }
    if (p === 2) {
      tramos.forEach((t, i) => {
        if (t.nombre.trim().length < 2) e[`t${i}nombre`] = 'Nombre';
        if (t.precio.trim() === '' || Number.isNaN(euros(t.precio)) || euros(t.precio) < 0) e[`t${i}precio`] = 'Precio';
        if (!(entero(t.cantidad) > 0)) e[`t${i}cantidad`] = 'Cantidad';
        if (t.codigo.trim() && !/^[A-Z0-9_-]{3,30}$/.test(t.codigo.trim())) e[`t${i}codigo`] = 'Código';
      });
      if (maxPorUsuario.trim() && !(entero(maxPorUsuario) >= 1 && entero(maxPorUsuario) <= 100)) e.max = 'Entre 1 y 100';
    }
    return e;
  }

  function siguiente() {
    const e = validar(paso);
    setErrores(e);
    if (Object.keys(e).length === 0) setPaso((p) => Math.min(p + 1, ultimoPaso));
  }

  const cuerpoEvento = () => ({
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    categoria,
    imagen_url: imagen.trim() || null,
    recinto: recinto.trim(),
    direccion: direccion.trim() || null,
    ciudad: ciudad.trim(),
    inicia_en: inicia!.toISOString(),
    termina_en: new Date(inicia!.getTime() + duracion * 3_600_000).toISOString(),
    puertas_abren_en: puertas ? puertas.toISOString() : null,
    max_por_usuario: maxPorUsuario.trim() ? entero(maxPorUsuario) : null,
    artistas,
    como_llegar: info.como_llegar.trim() || null,
    parking: info.parking.trim() || null,
    accesibilidad: info.accesibilidad.trim() || null,
    objetos_prohibidos: info.objetos_prohibidos.trim() || null,
  });

  async function guardar(publicar: boolean) {
    for (const p of [0, 1, ...(editando ? [] : [2])]) {
      const e = validar(p);
      if (Object.keys(e).length) {
        setErrores(e);
        setPaso(p);
        return;
      }
    }
    setGuardando(publicar ? 'publicar' : 'borrador');
    try {
      if (editando) {
        await api(`/organizador/eventos/${id}`, { method: 'PATCH', body: cuerpoEvento() });
        avisar('Cambios guardados', 'exito');
        await invalidarYo(qc);
        navigation.goBack();
        return;
      }
      const r = await api<{ evento: EventoGestion }>('/organizador/eventos', {
        method: 'POST',
        body: {
          ...cuerpoEvento(),
          tramos: tramos.map((t, i) => ({
            nombre: t.nombre.trim(),
            precio_centimos: euros(t.precio),
            cantidad_total: entero(t.cantidad),
            max_por_pedido: Math.max(1, Math.min(50, entero(t.max) || 10)),
            codigo_acceso: t.codigo.trim() || null,
            accesible: t.accesible,
            incluye_acompanante: t.accesible,
            orden: i,
          })),
        },
      });
      if (publicar) await api(`/organizador/eventos/${r.evento.id}/publicar`, { method: 'POST' });
      await invalidarYo(qc);
      avisar(publicar ? '¡Evento publicado! Ya está a la venta' : 'Borrador guardado', 'exito');
      navigation.replace('GestionEvento', { id: r.evento.id });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setGuardando(null);
    }
  }

  if (editando && !existente) {
    return (
      <Pantalla cabecera={<Cabecera titulo="Editar evento" cerrar />}>
        <Esqueleto alto={300} r={radio.l} />
      </Pantalla>
    );
  }

  const aforo = tramos.reduce((a, t) => a + (entero(t.cantidad) || 0), 0);
  const desde = Math.min(...tramos.map((t) => euros(t.precio)).filter((n) => !Number.isNaN(n)));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla
        cabecera={<Cabecera titulo={editando ? 'Editar evento' : 'Nuevo evento'} cerrar />}
        pie={
          paso < ultimoPaso ? (
            <Fila gap={espacio.s}>
              {paso > 0 && (
                <Boton v="secundario" bloque={false} onPress={() => setPaso(paso - 1)} icono="arrow-back">
                  Atrás
                </Boton>
              )}
              <Boton onPress={siguiente} icono="arrow-forward" style={{ flex: 1 }}>
                Siguiente
              </Boton>
            </Fila>
          ) : editando ? (
            <Fila gap={espacio.s}>
              <Boton v="secundario" bloque={false} onPress={() => setPaso(0)} icono="arrow-back">
                Atrás
              </Boton>
              <Boton onPress={() => void guardar(false)} cargando={guardando !== null} style={{ flex: 1 }}>
                Guardar cambios
              </Boton>
            </Fila>
          ) : (
            <Fila gap={espacio.s}>
              <Boton v="secundario" onPress={() => void guardar(false)} cargando={guardando === 'borrador'} style={{ flex: 1 }}>
                Guardar borrador
              </Boton>
              <Boton onPress={() => void guardar(true)} cargando={guardando === 'publicar'} icono="rocket" style={{ flex: 1.3 }}>
                Publicar
              </Boton>
            </Fila>
          )
        }
      >
        {/* Progreso del asistente */}
        <View style={{ gap: espacio.s, marginBottom: espacio.xxl }}>
          <Fila gap={6}>
            {PASOS.slice(0, ultimoPaso + 1).map((p, i) => (
              <View key={p} style={[s.paso, i <= paso && { backgroundColor: color.acento }]} />
            ))}
          </Fila>
          <T v="nota" c="texto2">
            Paso {paso + 1} de {ultimoPaso + 1} · {PASOS[paso]}
          </T>
        </View>

        {paso === 0 && (
          <View style={{ gap: espacio.l }}>
            <T v="titulo">¿Qué vas a organizar?</T>
            <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} error={errores.titulo} placeholder="Ej.: Noche Indie en la Sala Malandar" maxLength={120} />
            <View style={{ gap: 6 }}>
              <T v="nota" c="texto2">
                Categoría
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
                {CATEGORIAS.map((c) => (
                  <Chip key={c.id} texto={c.nombre} icono={c.icono} activo={categoria === c.id} onPress={() => setCategoria(c.id)} />
                ))}
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <T v="nota" c="texto2">
                Artistas (opcional)
              </T>
              {artistas.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
                  {artistas.map((a) => (
                    <Chip key={a} texto={a} icono="close" activo onPress={() => setArtistas((l) => l.filter((x) => x !== a))} />
                  ))}
                </View>
              )}
              <Fila gap={espacio.s}>
                <View style={{ flex: 1 }}>
                  <Campo
                    etiqueta="Añadir artista"
                    value={nuevoArtista}
                    onChangeText={setNuevoArtista}
                    placeholder="Nombre del artista o grupo"
                    icono="mic-outline"
                    onSubmitEditing={anadirArtista}
                  />
                </View>
                <Boton v="secundario" bloque={false} deshabilitado={nuevoArtista.trim().length < 2} onPress={anadirArtista} style={{ marginTop: 22 }}>
                  Añadir
                </Boton>
              </Fila>
              <T v="nota" c="texto3">
                Quien siga a estos artistas recibirá un aviso al publicar
              </T>
            </View>
            <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} multiline placeholder="Cuenta qué va a pasar, quién actúa, qué incluye la entrada…" maxLength={5000} />
            <Campo etiqueta="Imagen (URL)" value={imagen} onChangeText={setImagen} error={errores.imagen} icono="image-outline" placeholder="https://…" autoCapitalize="none" keyboardType="url" ayuda="Formato horizontal, mínimo 1200 px de ancho" />
            <ImagenEvento uri={/^https?:\/\//.test(imagen) ? imagen : null} categoria={categoria} style={{ height: 180 }} />
          </View>
        )}

        {paso === 1 && (
          <View style={{ gap: espacio.l }}>
            <T v="titulo">Cuándo y dónde</T>
            <SelectorFecha etiqueta="Empieza" valor={inicia} onCambio={setInicia} minimo={new Date()} />
            {errores.inicia && (
              <T v="nota" c="peligro" style={{ marginTop: -espacio.s }}>
                {errores.inicia}
              </T>
            )}
            <View style={{ gap: 6 }}>
              <T v="nota" c="texto2">
                Duración aproximada
              </T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
                {DURACIONES.map((h) => (
                  <Chip key={h} texto={h === 24 ? 'Todo el día' : `${h} h`} activo={duracion === h} onPress={() => setDuracion(h)} />
                ))}
              </ScrollView>
            </View>
            <SelectorFecha etiqueta="Apertura de puertas (opcional)" valor={puertas} onCambio={setPuertas} minimo={new Date()} />
            {errores.puertas && (
              <T v="nota" c="peligro" style={{ marginTop: -espacio.s }}>
                {errores.puertas}
              </T>
            )}
            <Campo etiqueta="Recinto" value={recinto} onChangeText={setRecinto} error={errores.recinto} icono="business-outline" placeholder="Sala, teatro, estadio…" />
            <Campo etiqueta="Dirección" value={direccion} onChangeText={setDireccion} icono="map-outline" placeholder="Calle y número (opcional)" />
            <Campo etiqueta="Ciudad" value={ciudad} onChangeText={setCiudad} error={errores.ciudad} icono="location-outline" placeholder="Ej.: Sevilla" />
            <Pulsable onPress={() => setVerInfo((v) => !v)} style={s.anadir} escala={0.98}>
              <Icono n={verInfo ? 'chevron-up' : 'information-circle-outline'} c={color.acento} />
              <T v="cuerpoFuerte" c="acento">
                Información práctica del recinto (opcional)
              </T>
            </Pulsable>
            {verInfo && (
              <View style={{ gap: espacio.l }}>
                <Campo etiqueta="Cómo llegar" value={info.como_llegar} onChangeText={(v) => setInfo((i) => ({ ...i, como_llegar: v }))} multiline placeholder="Metro, bus, lanzaderas…" />
                <Campo etiqueta="Parking" value={info.parking} onChangeText={(v) => setInfo((i) => ({ ...i, parking: v }))} multiline placeholder="Dónde aparcar y precio" />
                <Campo etiqueta="Accesibilidad" value={info.accesibilidad} onChangeText={(v) => setInfo((i) => ({ ...i, accesibilidad: v }))} multiline placeholder="Rampas, zona reservada, aseos adaptados…" />
                <Campo etiqueta="Objetos prohibidos" value={info.objetos_prohibidos} onChangeText={(v) => setInfo((i) => ({ ...i, objetos_prohibidos: v }))} multiline placeholder="Cristal, paraguas, cámaras…" />
                <T v="nota" c="texto3">
                  Se guarda en la ficha del recinto y se muestra en todos sus eventos.
                </T>
              </View>
            )}
          </View>
        )}

        {paso === 2 && (
          <View style={{ gap: espacio.l }}>
            <T v="titulo">Tipos de entrada</T>
            <T c="texto2" style={{ marginTop: -espacio.s }}>
              Crea tantos como necesites: anticipada, general, VIP… Pon 0 € para entradas gratuitas.
            </T>
            {tramos.map((t, i) => {
              const cambiar = (k: keyof TramoForm) => (v: string) => setTramos((ts) => ts.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
              return (
                <View key={i} style={s.tramo}>
                  <Fila style={{ justifyContent: 'space-between' }}>
                    <T v="mini" c="texto3">
                      Entrada {i + 1}
                    </T>
                    {tramos.length > 1 && <BotonIcono n="trash-outline" etiqueta="Quitar tipo de entrada" c={color.peligro} fondo="transparent" tam={18} onPress={() => setTramos((ts) => ts.filter((_, j) => j !== i))} />}
                  </Fila>
                  <Campo etiqueta="Nombre" value={t.nombre} onChangeText={cambiar('nombre')} error={errores[`t${i}nombre`] && 'Pon un nombre'} placeholder="General, VIP…" />
                  <Fila gap={espacio.s} style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Campo etiqueta="Precio (€)" value={t.precio} onChangeText={cambiar('precio')} error={errores[`t${i}precio`] && 'Precio no válido'} keyboardType="decimal-pad" placeholder="15" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Campo etiqueta="Cantidad" value={t.cantidad} onChangeText={cambiar('cantidad')} error={errores[`t${i}cantidad`] && 'Mínimo 1'} keyboardType="number-pad" placeholder="200" />
                    </View>
                    <View style={{ flex: 0.8 }}>
                      <Campo etiqueta="Máx./pedido" value={t.max} onChangeText={cambiar('max')} keyboardType="number-pad" />
                    </View>
                  </Fila>
                  <Campo
                    etiqueta="Código de preventa (opcional)"
                    value={t.codigo}
                    onChangeText={(v) => cambiar('codigo')(v.toUpperCase())}
                    error={errores[`t${i}codigo`] && 'Solo letras, números, - y _ (3 a 30)'}
                    placeholder="Ej.: FANCLUB"
                    autoCapitalize="characters"
                    icono="key-outline"
                    ayuda="Si lo rellenas, este tipo de entrada solo se ve y se compra con el código"
                  />
                  <Chip
                    texto="Plaza accesible + acompañante gratis"
                    icono="accessibility-outline"
                    activo={t.accesible}
                    onPress={() => setTramos((ts) => ts.map((x, j) => (j === i ? { ...x, accesible: !x.accesible } : x)))}
                  />
                </View>
              );
            })}
            <Campo
              etiqueta="Máximo de entradas por persona (opcional)"
              value={maxPorUsuario}
              onChangeText={setMaxPorUsuario}
              error={errores.max}
              keyboardType="number-pad"
              icono="person-outline"
              ayuda="Frena a la reventa: cuenta todas las compras de la misma cuenta"
            />
            <Pulsable onPress={() => setTramos((ts) => [...ts, { nombre: '', precio: '', cantidad: '', max: '6', codigo: '', accesible: false }])} style={s.anadir} escala={0.98}>
              <Icono n="add-circle-outline" c={color.acento} />
              <T v="cuerpoFuerte" c="acento">
                Añadir otro tipo de entrada
              </T>
            </Pulsable>
          </View>
        )}

        {paso === 3 && inicia && (
          <View style={{ gap: espacio.l }}>
            <T v="titulo">Revisa y publica</T>
            <ImagenEvento uri={imagen || null} categoria={categoria} style={{ height: 160 }} />
            <View style={s.resumen}>
              <T v="subtitulo">{titulo}</T>
              <T c="texto2">
                {fechaLarga(inicia.toISOString())} · {hora(inicia.toISOString())}
              </T>
              <T c="texto2">
                {recinto}, {ciudad}
              </T>
              {artistas.length > 0 && <T c="texto2">Con {artistas.join(', ')}</T>}
              <Separador m={espacio.s} />
              {tramos.map((t, i) => (
                <Fila key={i} style={{ justifyContent: 'space-between' }}>
                  <T>
                    {t.nombre} · {entero(t.cantidad)} uds.{t.codigo ? ` · 🔑 ${t.codigo}` : ''}
                  </T>
                  <T v="cuerpoFuerte">{precio(euros(t.precio))}</T>
                </Fila>
              ))}
              <Separador m={espacio.s} />
              <Fila style={{ justifyContent: 'space-between' }}>
                <T c="texto2">Aforo total</T>
                <T v="cuerpoFuerte">{aforo.toLocaleString('es-ES')}</T>
              </Fila>
              <Fila style={{ justifyContent: 'space-between' }}>
                <T c="texto2">Precio desde</T>
                <T v="cuerpoFuerte">{precio(desde)}</T>
              </Fila>
            </View>
            <Fila gap={espacio.m} style={{ alignItems: 'flex-start' }}>
              <Icono n="information-circle-outline" c={color.texto3} />
              <T v="nota" c="texto3" style={{ flex: 1 }}>
                Al publicar aceptas las condiciones para organizadores. Si guardas como borrador, nadie lo verá hasta que lo publiques.
              </T>
            </Fila>
          </View>
        )}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  paso: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.superficie3 },
  tramo: { gap: espacio.m, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  anadir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.s, minHeight: 56, borderRadius: radio.l, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.bordeFuerte },
  resumen: { gap: 6, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
