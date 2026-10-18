# 0002 · QR firmados con HMAC en el servidor

**Estado:** aceptada · 2026-10-18

## Contexto
La «firma» del QR era un hash de 32 bits calculado también en la app: cualquiera podía fabricar uno. Además el QR
caducaba a los 10 minutos de la compra, así que una entrada comprada con antelación no servía el día del evento.

## Decisión
HMAC-SHA256 con `QR_SIGNING_SECRET`, solo en el servidor. Validez hasta 48 h después del evento. El uso único lo
garantiza el cambio atómico `VALIDO → USADO`.

## Consecuencias
Los QR emitidos con el sistema anterior no pasan la validación: hay que volver a emitirlos (o regenerarlos con un script)
antes de abrir puertas.
