import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Envuelve un controlador async para que cualquier error llegue al manejador global. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
