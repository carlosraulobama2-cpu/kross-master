import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';

/** Corta la petición con 400 si alguna regla de express-validator falló (antes las reglas se declaraban pero nunca se comprobaban). */
export function validate(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  res.status(400).json({ mensaje: result.array()[0].msg, errores: result.array().map((e) => ({ campo: 'path' in e ? e.path : '', mensaje: e.msg })) });
}
