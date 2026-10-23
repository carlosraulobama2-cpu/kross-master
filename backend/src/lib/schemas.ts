import { z } from 'zod';

export const uuid = z.string().uuid('Identificador no válido');
export const idParam = z.object({ id: uuid });

export const paginacion = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export function rango({ pagina, porPagina }: { pagina: number; porPagina: number }): [number, number] {
  const desde = (pagina - 1) * porPagina;
  return [desde, desde + porPagina - 1];
}

export const CATEGORIAS = ['conciertos', 'festivales', 'deportes', 'teatro', 'clubbing', 'otros'] as const;
