# Kroos Master

App de venta de entradas para eventos con QR firmado, backend Express y soporte para Supabase + Stripe.

## Estructura

```
kroos master/
├── frontend/              # App Expo (React Native)
│   ├── src/
│   │   ├── config/        # Supabase
│   │   ├── context/       # Auth, entradas, settings
│   │   ├── screens/       # Home, detalle, entradas, login, registro, pago, QR, perfil, ajustes, onboarding, splash
│   │   └── navigation/    # Navegación
│   ├── .env.example
│   ├── .gitignore
│   ├── app.json
│   └── package.json
├── backend/               # API REST Express (legacy / opcional)
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
└── supabase/              # Proyecto Supabase
    ├── schema.sql         # Tablas, RLS, índices y funciones
    ├── seed.sql           # Datos de prueba
    ├── migrations/
    ├── functions/
    │   ├── create-payment-intent/
    │   ├── stripe-webhook/
    │   └── validar-qr/
    └── README.md
```

## Frontend

### Requisitos
- Node.js >= 18
- Expo CLI
- Cuenta en Supabase
- Cuenta en Stripe

### Instalación

```bash
cd frontend
npm install
```

### Variables de entorno

Copiar `frontend/.env.example` como `frontend/.env` y completar:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Ejecutar

```bash
npx expo start
```

## Backend (opcional)

### Instalación

```bash
cd backend
npm install
```

### Variables de entorno

Copiar `backend/.env.example` como `backend/.env` y completar:

```env
PORT=3000
JWT_SECRET=
DB_PATH=./kroos_master.db
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Ejecutar

```bash
npm start
```

## Supabase

1. Crear proyecto en https://supabase.com
2. Ejecutar `supabase/schema.sql` en el SQL Editor
3. Ejecutar `supabase/seed.sql` para datos de prueba
4. Configurar variables de entorno en el frontend
5. Desplegar Edge Functions de `supabase/functions/`

### Edge Functions

- `create-payment-intent`: crea un PaymentIntent de Stripe
- `stripe-webhook`: recibe notificaciones de Stripe
- `validar-qr`: valida y marca entradas como usadas

## QR Code Data

```json
{
  "ticket_id": "TK-...",
  "event_id": "EV-2026-...",
  "seat": "A-12",
  "firma": "SIG-XXXXXXXX"
}
```

## Flujo de pago

1. Usuario selecciona evento y asiento
2. App navega a `PaymentScreen`
3. `PaymentScreen` llama a Edge Function `create-payment-intent`
4. Stripe devuelve `client_secret`
5. App abre la pasarela de pago nativa
6. Usuario paga con tarjeta / Apple Pay / Google Pay
7. Stripe envía webhook a `stripe-webhook`
8. App recibe éxito y genera la entrada QR

## Notas

- En desarrollo usar claves `pk_test_...` de Stripe
- En producción cambiar a `pk_live_...`
- No exponer claves secretas en el frontend
- El webhook de Stripe debe estar configurado en el dashboard de Stripe
- Usar `supabase migration new` y `supabase db push` para migraciones
