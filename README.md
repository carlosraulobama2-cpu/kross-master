# Kroos Master

App de ticketing de eventos con React Native + Expo, Supabase y Stripe.

## Requisitos

- Node.js >= 18
- npm >= 9
- Expo CLI
- Cuenta Supabase
- Cuenta Stripe
- EAS CLI (opcional, para builds nativos)

## Setup rápido

1. Clonar el repo
2. Copiar `.env.example` a `.env` en `frontend/` y `backend/`
3. Completar variables de entorno
4. Aplicar `supabase/schema.sql` en Supabase Cloud
5. Ejecutar seed de `supabase/seed.sql` (opcional)

## Variables de entorno

### Frontend (`frontend/.env`)

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_BACKEND_URL`

### Backend (`backend/.env`)

- `PORT=3000`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npx expo start
```

## Tests

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run typecheck
```

## Build nativo

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Build de desarrollo
eas build --profile development --platform ios

# Build de producción
eas build --profile production --platform all
```

## Deploy

### Backend en Render

1. Crear cuenta en [Render](https://render.com)
2. Crear nuevo Web Service
3. Conectar el repositorio de GitHub
4. Configurar:
   - **Root Directory**: `backend`
   - **Runtime**: Node.js
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free o Starter
5. Agregar variables de entorno:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `JWT_SECRET` (generar uno aleatorio)
6. Deploy automático en cada push a `main`
7. La URL pública será: `https://kross-master.onrender.com`

### Frontend en Expo EAS

1. Instalar EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configurar proyecto: `eas build:configure`
4. Build iOS: `eas build --profile production --platform ios`
5. Build Android: `eas build --profile production --platform android`

## Estructura

- `frontend/` - App React Native + Expo
- `backend/` - API Express + TypeScript
- `supabase/` - Schema SQL y seed
- `render.yaml` - Configuración de deploy en Render

## Scripts útiles

```bash
# Backend
npm run build      # Compilar TypeScript
npm run dev        # Desarrollo con ts-node
npm run watch      # Desarrollo con hot reload
npm run check:env  # Validar variables de entorno
npm test           # Tests unitarios

# Frontend
npm start          # Expo dev server
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
npm run typecheck  # Verificar tipos TypeScript
```

## Licencia

ISC
