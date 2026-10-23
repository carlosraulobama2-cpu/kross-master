# Kroos Master · App

App de iOS y Android (Expo + React Native + **TypeScript**), rediseñada desde cero.
Habla solo con la API de `backend/`: no accede a la base de datos directamente.

```bash
cp .env.example .env   # EXPO_PUBLIC_API_URL y EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
npm install
npx expo start         # escanea el QR con Expo Go o abre un simulador
npm run typecheck
```

El pago usa Stripe PaymentSheet (tarjeta, Apple Pay, Google Pay), que necesita una
*development build* (`eas build --profile development`), no Expo Go. La versión web
sirve para previsualizar la interfaz; desde web no se puede pagar.

## Qué incluye

| Área | Pantallas |
| --- | --- |
| Descubrir | Bienvenida, Explorar (destacados, esta semana, por ciudad), Buscar con filtros, Ficha del evento |
| Comprar | Selección de entradas por tipo, pago con cuenta atrás de reserva, confirmación |
| Entradas | Cartera tipo billete, QR dinámico (cambia cada 30 s, sin conexión, brillo al máximo), transferir y aceptar |
| Perfil | Datos, notificaciones, favoritos, textos legales, baja de cuenta |
| Organizador | Panel de ventas, asistente para crear eventos, gestión (ventas, tipos de entrada, equipo de puerta, cancelación), conexión con Stripe |
| Puerta | Escáner con resultado a pantalla completa, código manual, contador de asistentes |

## Estructura

```
src/
├── theme/        Tokens de diseño: colores, tipografía, espacios, radios
├── components/   Kit de UI (botones con háptica, chips, campos, esqueletos, avisos, tarjetas)
├── lib/          API (con renovación de sesión), auth, consultas (TanStack Query), QR, pagos
├── navigation/   Pestañas + pantallas, enlaces profundos (kroosmaster://evento/<id>)
└── screens/      auth · explorar · compra · entradas · perfil · organizador
```

Los archivos `*.web.tsx` sustituyen a los nativos en web (pagos, selector de fecha).
