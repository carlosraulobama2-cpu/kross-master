import { Router, type Request } from 'express';
import { z } from 'zod';
import { noEncontrado } from '../lib/errors';
import { idParam } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { optionalAuth, requireAuth, usuarioDe } from '../middleware/auth';
import { params, query } from '../middleware/validate';

/** Páginas públicas de artistas y recintos, y seguirlos. */
export const artistasRouter = Router();
export const recintosRouter = Router();

const busqueda = z.object({ q: z.string().trim().min(1).max(60) });
const literal = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

async function proximosEventos(columna: 'id', ids: string[]) {
  if (!ids.length) return [];
  return ok(await db.from('catalogo_eventos').select('*').in(columna, ids).gte('inicia_en', new Date().toISOString()).order('inicia_en'));
}

async function sigo(req: Request, tipo: 'artista_id' | 'recinto_id', id: string): Promise<boolean> {
  if (!req.usuario) return false;
  const { data } = await db.from('seguimientos').select('usuario_id').eq('usuario_id', req.usuario.id).eq(tipo, id).maybeSingle();
  return Boolean(data);
}

async function seguidores(tipo: 'artista_id' | 'recinto_id', id: string): Promise<number> {
  const { count } = await db.from('seguimientos').select('usuario_id', { count: 'exact', head: true }).eq(tipo, id);
  return count ?? 0;
}

function rutasSeguir(router: Router, tipo: 'artista_id' | 'recinto_id') {
  router.put('/:id/seguir', requireAuth, async (req, res) => {
    const { id } = params(req, idParam);
    const yo = usuarioDe(req);
    const { error } = await db.from('seguimientos').insert({ usuario_id: yo.id, [tipo]: id });
    if (error && error.code !== '23505') throw error; // ya lo seguía
    res.status(204).end();
  });
  router.delete('/:id/seguir', requireAuth, async (req, res) => {
    const { id } = params(req, idParam);
    ok(await db.from('seguimientos').delete().eq('usuario_id', usuarioDe(req).id).eq(tipo, id));
    res.status(204).end();
  });
}

artistasRouter.get('/', async (req, res) => {
  const { q } = query(req, busqueda);
  const artistas = ok(await db.from('artistas').select('id, nombre, imagen_url, generos').ilike('nombre', `%${literal(q)}%`).order('nombre').limit(10));
  res.json({ artistas });
});

artistasRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const artista = ok(await db.from('artistas').select('id, nombre, imagen_url, bio, generos').eq('id', id).maybeSingle());
  if (!artista) throw noEncontrado('Artista');
  const { data: relaciones } = await db.from('evento_artistas').select('evento_id').eq('artista_id', id);
  const [eventos, siguiendo, n] = await Promise.all([
    proximosEventos('id', (relaciones ?? []).map((r) => r.evento_id)),
    sigo(req, 'artista_id', id),
    seguidores('artista_id', id),
  ]);
  res.json({ artista: { ...artista, eventos, siguiendo, seguidores: n } });
});
rutasSeguir(artistasRouter, 'artista_id');

recintosRouter.get('/', async (req, res) => {
  const { q } = query(req, busqueda);
  const recintos = ok(
    await db.from('recintos').select('id, nombre, direccion, ciudad, imagen_url').ilike('nombre', `%${literal(q)}%`).order('nombre').limit(10),
  );
  res.json({ recintos });
});

recintosRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const recinto = ok(
    await db.from('recintos').select('id, nombre, direccion, ciudad, imagen_url, aforo, como_llegar, parking, accesibilidad, objetos_prohibidos').eq('id', id).maybeSingle(),
  );
  if (!recinto) throw noEncontrado('Recinto');
  const [eventos, siguiendo, n] = await Promise.all([
    ok(await db.from('catalogo_eventos').select('*').eq('recinto_id', id).gte('inicia_en', new Date().toISOString()).order('inicia_en')),
    sigo(req, 'recinto_id', id),
    seguidores('recinto_id', id),
  ]);
  res.json({ recinto: { ...recinto, eventos, siguiendo, seguidores: n } });
});
rutasSeguir(recintosRouter, 'recinto_id');
