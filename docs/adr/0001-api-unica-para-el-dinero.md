# 0001 · La API es la única que emite entradas

**Estado:** aceptada · 2026-10-18

## Contexto
Había tres caminos para crear una entrada: el backend (`confirmar-pago` y webhook, que podían crear dos entradas por un
pago), tres funciones de Supabase con la misma lógica, y la propia app insertando en `entradas` gracias a una política
RLS que lo permitía (entradas gratis). El importe del pago lo mandaba la app.

## Decisión
- Solo la API emite entradas, con la función SQL `emitir_entrada` (atómica e idempotente por `payment_intent_id`).
- Se elimina la política RLS de inserción de entradas y las funciones de Supabase duplicadas (siguen en el historial de git).
- El importe sale del precio del evento en la base de datos.

## Consecuencias
- Una entrada por pago, sin sobreventa y sin entradas sin pagar.
- Cualquier cambio de pagos se hace en `backend/src/modules/payments` y `tickets`.
