# Kroos Master

Plataforma de venta de entradas: app móvil para comprar y llevar las entradas,
herramientas para organizadores y control de acceso en la puerta.

| Carpeta | Qué es | Tecnología |
| --- | --- | --- |
| [`backend/`](backend/README.md) | API REST, pagos y lógica de negocio | Node.js · TypeScript · Express 5 · Zod · Stripe |
| [`admin-panel/`](admin-panel/README.md) | Panel de administración | React 19 · Vite · TypeScript · TanStack Query |
| [`frontend/`](frontend/README.md) | App iOS / Android | Expo · React Native · TypeScript |
| [`supabase/`](supabase/README.md) | Base de datos, funciones SQL y datos de demo | PostgreSQL (Supabase) |

```
App ──┐
      ├──▶ API (backend) ──▶ Supabase (Postgres + Auth)
Panel ┘         │
                └──▶ Stripe (pagos, Connect, webhooks)
```

## Puesta en marcha local

1. **Base de datos**: crea un proyecto en Supabase y aplica
   `supabase/migrations/20261023000000_esquema_v2.sql`. Para datos de prueba, `supabase/seed.sql`
   (cuentas `*@kroosmaster.dev`, contraseña `kroosmaster`).
2. **API**: `cd backend && cp .env.example .env && npm install && npm run dev`
3. **Panel**: `cd admin-panel && cp .env.example .env && npm install && npm run dev`
4. **App**: `cd frontend && cp .env.example .env && npm install && npx expo start`

`scripts/verificar.sh` comprueba tipos, tests y builds de todo (lo mismo que la CI).

## Seguridad en pocas líneas

- Solo la API escribe en la base de datos; los clientes solo leen el catálogo público.
- El rol de cada usuario se guarda en la base de datos y solo lo cambia un administrador.
- El precio se calcula en el servidor y las entradas solo se emiten cuando Stripe confirma el cobro.
- El QR de cada entrada cambia cada 30 s (HMAC‑TOTP): las capturas no sirven.

Análisis completo y estado del proyecto: [`docs/ANALISIS.md`](docs/ANALISIS.md).
