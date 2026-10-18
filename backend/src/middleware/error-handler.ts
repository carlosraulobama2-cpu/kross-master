import { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/errors';
import { env } from '../config/env';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
}

/** Un solo sitio donde los errores se convierten en respuesta. Los inesperados no filtran detalles internos. */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ mensaje: error.message, error: error.message, ...(error.detail ? { detalle: error.detail } : {}) });
  }
  if (!env.isTest) console.error(`[${req.method} ${req.path}]`, error);
  res.status(500).json({ mensaje: 'Error interno del servidor', error: 'Error interno del servidor' });
}
