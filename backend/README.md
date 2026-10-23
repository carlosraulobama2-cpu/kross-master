# Kroos Master · API

API REST en **Node.js + TypeScript** (Express 5, Zod, Stripe, Supabase).
Es la única pieza que escribe en la base de datos: la app y el panel solo
hablan con esta API.

## Puesta en marcha

```bash
cp .env.example .env    # rellena las claves
npm install
npm run dev             # http://localhost:3000
```

Antes, aplica `supabase/migrations/20261023000000_esquema_v2.sql` en tu
proyecto de Supabase. Para nombrar al primer administrador:

```sql
update public.usuarios set rol = 'admin' where email = 'tu@email.com';
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor con recarga automática |
| `npm run build` / `npm start` | Compila a `dist/` y lo arranca |
| `npm run typecheck` | Comprueba tipos |
| `npm test` | Tests (QR, validación, seguridad HTTP) |

## Stripe

1. Crea un webhook apuntando a `https://TU_API/api/webhooks/stripe` con los eventos
   `payment_intent.succeeded`, `payment_intent.canceled`, `charge.refunded` y `account.updated`.
2. Copia su secreto en `STRIPE_WEBHOOK_SECRET`.
3. En local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

Las entradas **solo** se emiten cuando Stripe confirma el cobro (webhook, o
consulta del pedido como respaldo). El importe se calcula siempre en el servidor.

## Estructura

```
src/
├── app.ts / server.ts     Express, middlewares y arranque
├── config/env.ts          Variables de entorno validadas con Zod
├── lib/                   Supabase, Stripe, QR (HMAC-TOTP), errores, logger
├── middleware/            Auth (rol desde la BD), validación, errores
├── services/              Pagos (webhook, reembolsos, cancelaciones) y notificaciones push
├── jobs/                  Liberar reservas caducadas, cerrar eventos pasados
└── modules/               Rutas por dominio
```

## Endpoints

Todas las respuestas de error tienen la forma `{ "error": { "codigo", "mensaje", "detalles?" } }`.

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health` | público |
| GET | `/api/config` | público |
| POST | `/api/auth/registro` · `/login` · `/refresh` · `/recuperar` | público (limitado) |
| GET/PATCH/DELETE | `/api/me` | sesión |
| PUT | `/api/me/push-token` | sesión |
| POST | `/api/me/organizador` | sesión |
| POST/GET | `/api/me/stripe/onboarding` · `/api/me/stripe/estado` | organizador |
| GET | `/api/me/favoritos` · `/api/me/notificaciones` | sesión |
| GET | `/api/eventos` · `/api/eventos/ciudades` · `/api/eventos/:id` | público |
| PUT/DELETE | `/api/eventos/:id/favorito` | sesión |
| GET · PUT | `/api/eventos/:id/resenas` · `/api/eventos/:id/resena` | público · asistentes |
| POST/GET | `/api/pedidos` · `/api/pedidos/:id` · `/api/pedidos/:id/cancelar` | sesión |
| GET | `/api/entradas` · `/api/entradas/:id` | titular |
| POST | `/api/entradas/:id/transferir` | titular |
| GET/POST | `/api/transferencias` · `/:id/aceptar` · `/:id/rechazar` · `/:id/cancelar` | sesión |
| GET/POST | `/api/puerta/eventos` · `/api/puerta/validar` · `/api/puerta/eventos/:id/resumen` | staff / organizador |
| * | `/api/organizador/eventos/...` (CRUD, tramos, publicar, cancelar, asistentes, staff) | organizador |
| * | `/api/admin/...` (resumen, usuarios, eventos, pedidos, reembolsos, auditoría, configuración) | admin |
| POST | `/api/webhooks/stripe` | Stripe (firmado) |
| GET | `/api/legal/terminos` · `/privacidad` · `/organizador` | público |
