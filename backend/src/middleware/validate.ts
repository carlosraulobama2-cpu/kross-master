import type { Request } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../lib/errors';

function parsear<S extends ZodTypeAny>(schema: S, datos: unknown): z.infer<S> {
  const r = schema.safeParse(datos);
  if (!r.success) {
    const campos = r.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
    throw new AppError(400, 'DATOS_INVALIDOS', campos[0]?.mensaje ?? 'Datos inválidos', campos);
  }
  return r.data;
}

export const body = <S extends ZodTypeAny>(req: Request, schema: S) => parsear(schema, req.body);
export const query = <S extends ZodTypeAny>(req: Request, schema: S) => parsear(schema, req.query);
export const params = <S extends ZodTypeAny>(req: Request, schema: S) => parsear(schema, req.params);
