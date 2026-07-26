# Kroos Master - Frontend

App Expo para Kroos Master.

## Requisitos

- Node.js >= 18
- Expo CLI
- Cuenta en Supabase
- Cuenta en Stripe

## Instalación

```bash
cd frontend
npm install
```

## Variables de entorno

Crear `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=TU_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICABLE_AQUI
```

## Ejecutar

```bash
npx expo start
```

## Estructura

```
frontend/
├── src/
│   ├── config/
│   │   ├── supabase.js
│   │   └── qrSigner.js
│   ├── context/
│   │   └── EntradasContext.js
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   ├── EventDetailScreen.js
│   │   ├── MisEntradasScreen.js
│   │   ├── LoginScreen.js
│   │   ├── RegistroScreen.js
│   │   └── PaymentScreen.js
│   └── navigation/
│       └── AppNavigator.js
├── .env
└── package.json
```

## Pagos con Stripe

La app usa Stripe React Native SDK. El flujo es:

1. Usuario selecciona evento y asiento
2. Navega a `PaymentScreen`
3. `PaymentScreen` llama a la Edge Function `create-payment-intent` de Supabase
4. Stripe devuelve un `client_secret`
5. App inicializa el Payment Sheet de Stripe
6. Usuario paga con tarjeta / Apple Pay / Google Pay
7. Stripe envía un webhook a `stripe-webhook`
8. App recibe éxito y genera la entrada QR

## QR Code Data

```json
{
  "ticket_id": "TK-...",
  "event_id": "EV-2026-...",
  "seat": "A-12",
  "firma": "SIG-XXXXXXXX"
}
```

## Notas

- En desarrollo usar claves `pk_test_...` de Stripe
- En producción cambiar a `pk_live_...`
- No exponer claves secretas en el frontend
- El webhook de Stripe debe estar configurado en el dashboard de Stripe
