/** Error de negocio con código HTTP: los servicios lo lanzan y el manejador global lo convierte en respuesta. */
export class AppError extends Error {
  constructor(readonly status: number, message: string, readonly detail?: unknown) {
    super(message);
  }
}

export const notFound = (message: string) => new AppError(404, message);
export const badRequest = (message: string) => new AppError(400, message);
export const forbidden = (message: string) => new AppError(403, message);
export const conflict = (message: string) => new AppError(409, message);
