# Arquitectura

## Piezas

| Pieza | Tecnología | Responsabilidad |
|---|---|---|
| App (`frontend/`) | Expo / React Native | Catálogo, compra (Stripe PaymentSheet), entradas con QR, escáner del staff |
| API (`backend/`) | Express + TypeScript | Reglas de negocio, pagos, emisión y validación de entradas, panel |
| Base de datos | Supabase (Postgres + Auth + RLS) | Datos y sesiones. La app lee con su sesión (RLS); lo sensible pasa por la API |
| Pagos | Stripe | Cobro; el webhook firmado es la fuente de verdad |
| Panel (`admin/`) | HTML + JS, servido en `/admin` | Administración (KPIs, usuarios, eventos, comisiones) |

## Capas de la API

```
ruta (validación de entrada) → controlador (HTTP) → servicio (reglas) → repositorio (Supabase)
```

- Los **servicios** no saben de HTTP: lanzan `AppError` y el manejador global responde.
- Los **repositorios** son interfaces; las pruebas usan uno en memoria (`modules/tickets/fake-repository.ts`).
- Los módulos de pagos, entradas y validación siguen ya este patrón; el resto conserva controladores
  directos y se migra igual cuando se toquen.

## Flujo de compra (el dinero, en un solo sitio)

1. La app pide `POST /api/stripe/crear-intento-pago` con su sesión. **El importe lo pone la API** con el precio del evento.
2. La app cobra con PaymentSheet.
3. Stripe llama al **webhook** firmado → la API emite la entrada.
4. La app llama a `POST /api/stripe/confirmar-pago`: la API comprueba con Stripe que el pago está cobrado y es de ese
   usuario y evento, y devuelve la entrada (la emite si el webhook aún no llegó).
5. La emisión es la función SQL `emitir_entrada`: bloquea el evento, comprueba aforo, inserta y descuenta en una
   transacción, y es **idempotente por pago** (webhook y confirmación pueden llegar los dos y repetirse).

## Entradas y QR

- El QR lleva `ticket_id`, evento, asiento, caducidad y un nonce, firmado con **HMAC-SHA256** (`QR_SIGNING_SECRET`).
  Sin esa clave no se puede fabricar ni modificar un QR válido.
- Vale hasta 48 h después del evento.
- `POST /api/qr/validar` exige sesión de staff autorizado del evento, del artista dueño o de un admin, y pasa la
  entrada de `VALIDO` a `USADO` de forma atómica (dos escáneres a la vez no la validan dos veces).
- Al transferir una entrada se firma un QR nuevo para el nuevo titular y el anterior deja de valer.

## Seguridad

- Sesión: token de Supabase en `Authorization: Bearer`; rol desde la tabla `usuarios` (un solo criterio, también en el panel).
- Al registrarse solo se puede elegir `fan` o `artista`.
- `helmet`, CORS limitado a `CORS_ORIGINS`, límites de peticiones (general, login, escáner), cuerpo JSON ≤ 1 MB.
- Las reglas de `express-validator` se comprueban de verdad (`middleware/validate.ts`).
- Variables obligatorias validadas al arrancar en producción (`config/env.ts`).

## Decisiones

Ver [docs/adr](adr/).
