# Kroos Master

App de venta de entradas para eventos con QR firmado, backend Express y soporte para Supabase + Stripe.

## Estructura

```
kroos master/
├── frontend/              # App Expo (React Native)
│   ├── src/
│   │   ├── config/        # Supabase y configuración
│   │   ├── context/       # Contexto de entradas y auth
│   │   ├── screens/       # Home, detalle, entradas, login, registro, pago
│   │   └── navigation/    # Navegación
│   ├── .env               # Variables de entorno Expo
│   └── package.json
├── backend/               # API REST Express (legacy / opcional)
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
└── supabase/              # Proyecto Supabase
    ├── schema.sql         # Tablas, RLS, índices y funciones
    ├── functions/
    │   ├── create-payment-intent/
    │   └── stripe-webhook/
    └── README.md
```

## Frontend

### Dependencias principales
- Expo
- React Navigation
- @expo/vector-icons
- react-native-qrcode-svg
- @supabase/supabase-js
- @stripe/stripe-react-native

### Variables de entorno

Crear `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICABLE_AQUI
```

### Ejecutar

```bash
cd frontend
npm install
npx expo start
```

## Supabase

1. Crear proyecto en https://supabase.com
2. Ejecutar `supabase/schema.sql` en el SQL Editor
3. Configurar variables de entorno en el frontend
4. Crear las Edge Functions de `supabase/functions/`

### Edge Functions

- `create-payment-intent`: crea un PaymentIntent de Stripe
- `stripe-webhook`: recibe notificaciones de Stripe

Para desplegar funciones localmente:

```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
```

## Backend (opcional)

Si querés mantener el backend Express además de Supabase:

```bash
cd backend
npm install
npm start
```

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
3. `PaymentScreen` llama a la Edge Function `create-payment-intent`
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

## Configuración de Stripe

### 1. Crear cuenta en Stripe

1. Ve a https://stripe.com
2. Crea una cuenta
3. Obtén tus claves:
   - Clave publicable: `pk_test_...` (para el frontend)
   - Clave secreta: `sk_test_...` (para el backend / Edge Functions)

### 2. Configurar variables de entorno

**Frontend (`frontend/.env`):**
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICABLE_AQUI
```

**Backend (`backend/.env`):**
```env
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
```

**Supabase Edge Function:**
Configurar en los secretos de Supabase:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI
```

### 3. Configurar Webhook en Stripe

1. Ve al dashboard de Stripe
2. Navega a Developers > Webhooks
3. Agrega un nuevo endpoint:
   - URL: `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook`
   - Eventos a escuchar: `payment_intent.succeeded`
4. Copia el webhook secret y configúralo en Supabase

### 4. Desplegar Edge Functions

```bash
cd supabase/functions/create-payment-intent
supabase functions deploy create-payment-intent

cd ../stripe-webhook
supabase functions deploy stripe-webhook
```

### 5. Probar en modo test

Stripe proporciona números de tarjeta de prueba:
- Número: `4242424242424242`
- Fecha: cualquier fecha futura
- CVC: cualquier 3 dígitos

## Seguridad

- Nunca expongas `STRIPE_SECRET_KEY` en el frontend
- Usa HTTPS en producción
- El webhook de Stripe valida la firma de cada evento
- Supabase RLS protege que cada usuario solo vea sus entradas
