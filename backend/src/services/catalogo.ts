import { db, ok } from '../lib/supabase';

export interface DatosRecinto {
  nombre: string;
  ciudad: string;
  direccion?: string | null;
  como_llegar?: string | null;
  parking?: string | null;
  accesibilidad?: string | null;
  objetos_prohibidos?: string | null;
}

/** ilike sin comodines: busca el texto literal. */
const literal = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

const INFO = ['direccion', 'como_llegar', 'parking', 'accesibilidad', 'objetos_prohibidos'] as const;

/**
 * Busca el recinto por nombre y ciudad (sin distinguir mayúsculas) o lo crea.
 * La información práctica solo se actualiza si el recinto es de quien edita.
 */
export async function recintoPara(datos: DatosRecinto, usuarioId: string, esAdmin: boolean): Promise<string> {
  const { data: existentes } = await db.from('recintos').select('id, nombre, ciudad, creado_por').ilike('nombre', literal(datos.nombre)).ilike('ciudad', literal(datos.ciudad));
  const existente = (existentes ?? [])[0];
  const info = Object.fromEntries(INFO.filter((k) => datos[k] !== undefined).map((k) => [k, datos[k] || null]));

  if (existente) {
    if (Object.keys(info).length && (esAdmin || existente.creado_por === usuarioId)) {
      ok(await db.from('recintos').update(info).eq('id', existente.id));
    }
    return existente.id;
  }
  const nuevo = ok(await db.from('recintos').insert({ nombre: datos.nombre, ciudad: datos.ciudad, ...info, creado_por: usuarioId }).select('id').single());
  return nuevo.id;
}

/** Sustituye la lista de artistas de un evento, creando los que no existan. */
export async function fijarArtistas(eventoId: string, nombres: string[], usuarioId: string): Promise<void> {
  // Sin duplicados (ignorando mayúsculas), conservando la primera forma escrita.
  const vistos = new Set<string>();
  const limpios = nombres
    .map((n) => n.trim())
    .filter((n) => n.length >= 2 && !vistos.has(n.toLowerCase()) && vistos.add(n.toLowerCase()))
    .slice(0, 20);
  ok(await db.from('evento_artistas').delete().eq('evento_id', eventoId));
  for (const [orden, nombre] of limpios.entries()) {
    const { data: existentes } = await db.from('artistas').select('id').ilike('nombre', literal(nombre));
    const id = existentes?.[0]?.id ?? ok(await db.from('artistas').insert({ nombre, creado_por: usuarioId }).select('id').single()).id;
    ok(await db.from('evento_artistas').insert({ evento_id: eventoId, artista_id: id, orden }));
  }
}

/** Usuarios que siguen a algún artista o al recinto del evento. */
export async function seguidoresDeEvento(eventoId: string): Promise<string[]> {
  const [{ data: ev }, { data: artistas }] = await Promise.all([
    db.from('eventos').select('recinto_id').eq('id', eventoId).single(),
    db.from('evento_artistas').select('artista_id').eq('evento_id', eventoId),
  ]);
  const ids = (artistas ?? []).map((a) => a.artista_id);
  const filtros = [ids.length ? `artista_id.in.(${ids.join(',')})` : null, ev?.recinto_id ? `recinto_id.eq.${ev.recinto_id}` : null].filter(Boolean);
  if (!filtros.length) return [];
  const { data } = await db.from('seguimientos').select('usuario_id').or(filtros.join(','));
  return [...new Set((data ?? []).map((s) => s.usuario_id as string))];
}
