# Kroos Master

Venta de entradas para eventos: app móvil (React Native + Expo), API (Node + Express + TypeScript),
Supabase (Postgres + Auth) y Stripe. Incluye un panel web de administración.

```
kross-master/
├── frontend/      App móvil (Expo): eventos, compra, mis entradas, escáner del staff
├── backend/       API REST (Express + TypeScript), organizada por módulos de dominio
│   └── src/
│       ├── app.ts / server.ts     app sin puerto (para pruebas) y arranque
│       ├── config/                variables validadas al arrancar, clientes de Supabase y Stripe
│       ├── common/                errores de negocio y utilidades HTTP
│       ├── middleware/            sesión y roles, validación, límites de peticiones, errores
│       └── modules/<dominio>/     routes → controller → service → repository (+ *.test.ts)
├── admin/         Panel web de administración (estático, lo sirve la API en /admin)
├── supabase/      schema.sql (foto completa) + migrations/ + seed.sql
├── scripts/       despliegue
├── docs/          arquitectura, decisiones (docs/adr) y capturas (docs/capturas)
└── .github/       CI (tipos, pruebas, build, Docker) y Dependabot
```

Más detalle: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Arrancar en local

```bash
cp backend/.env.example backend/.env       # rellena Supabase, Stripe y QR_SIGNING_SECRET
cp frontend/.env.example frontend/.env

cd backend && npm ci && npm run dev        # API en http://localhost:3000 (panel en /admin)
cd frontend && npm ci && npx expo start    # app
```

Base de datos: aplica `supabase/schema.sql` y después `supabase/migrations/` en orden (Supabase CLI: `supabase db push`).

## Calidad

```bash
cd backend && npm run typecheck && npm test && npm run build
cd frontend && npm run typecheck
```

La integración continua (`.github/workflows/ci.yml`) ejecuta lo mismo en cada PR, más el build de Docker.

## Despliegue

- API en Render (`render.yaml`) o con Docker (`docker build -f backend/Dockerfile .`).
- En producción la API **no arranca** si falta una variable obligatoria (`backend/.env.example`).
- App: `eas build --profile production --platform all`. Script completo: `scripts/deploy.sh`.
